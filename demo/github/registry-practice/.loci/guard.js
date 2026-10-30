// Turns a visualization module into code the sandboxed runner can execute (DEMO_PLAN.md section 6).
//  - parses with acorn and rejects imports and any export other than `export default { ... }`
//  - rewrites `export default` into an assignment the runner reads
//  - inserts a loop guard at the top of every loop body so a runaway loop throws instead of freezing the page
//  - reads title/hook/tags/license/t0/param from the exported object without running it
// Inserted text never adds newlines, so line numbers in error messages match the author's source.
// The practice registry's check workflow runs this same file.

import * as acorn from 'acorn';
import MagicString from 'magic-string';

export const MAX_CODE_BYTES = 50_000;
export const FRAME_BUDGET_MS = 250;

const LOOPS = new Set(['ForStatement', 'ForInStatement', 'ForOfStatement', 'WhileStatement', 'DoWhileStatement']);
// Checks the clock once every 65,536 iterations, so tight loops stay fast.
const GUARD = `if((++__lg&65535)===0&&__lgc())throw new Error("This frame ran for over ${FRAME_BUDGET_MS} ms, so it was stopped. Is there an infinite loop?");`;
const KIT = 'hex, mix, rgba, label, clipBox, fsFor';

export class GuardError extends Error {
  constructor(message, line = null, column = null) {
    super(message);
    this.line = line;
    this.column = column;
  }
}

const fail = (message, node) => new GuardError(message, node?.loc?.start.line ?? null, node?.loc?.start.column ?? null);

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const key in node) {
    if (key === 'loc') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach(child => walk(child, visit));
    else if (v && typeof v.type === 'string') walk(v, visit);
  }
}

/** @returns {{code: string, meta: object}} `code` is a classic script for the runner. */
export function guard(source) {
  if (typeof source !== 'string' || !source.trim()) throw new GuardError('The code is empty.');
  if (Buffer.byteLength(source) > MAX_CODE_BYTES) throw new GuardError(`The code is over ${MAX_CODE_BYTES / 1000} KB.`);

  let ast;
  try {
    ast = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'module', locations: true });
  } catch (e) {
    throw new GuardError(`Syntax error: ${e.message.replace(/ \(\d+:\d+\)$/, '')}`, e.loc?.line ?? null, e.loc?.column ?? null);
  }

  const s = new MagicString(source);
  let exported = null;
  walk(ast, node => {
    switch (node.type) {
      case 'ImportDeclaration':
      case 'ImportExpression':
        throw fail(`Imports aren't allowed. The kit helpers (${KIT}) are already available.`, node);
      case 'MetaProperty':
        throw fail('import.meta is not available here.', node);
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
        throw fail('Only one export is allowed: `export default { ... }`.', node);
      case 'ExportDefaultDeclaration':
        exported = node;
        break;
    }
    if (LOOPS.has(node.type)) {
      const body = node.body;
      if (body.type === 'BlockStatement') s.appendLeft(body.start + 1, GUARD);
      else { s.prependRight(body.start, '{' + GUARD); s.appendLeft(body.end, '}'); }
    }
  });

  if (!exported) throw new GuardError('Missing `export default { draw(ctx, w, h, t, P, S, B) { ... } }`.');
  const decl = exported.declaration;
  if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration' || decl.type === 'ArrowFunctionExpression' || decl.type === 'FunctionExpression') {
    throw fail('Export an object, like `export default { draw(ctx, w, h, t, P, S, B) { ... } }`.', exported);
  }
  if (decl.type === 'ObjectExpression' && !decl.properties.some(p => p.type === 'Property' && propName(p) === 'draw')) {
    throw fail('The exported object needs a draw(ctx, w, h, t, P, S, B) function.', decl);
  }
  s.overwrite(exported.start, decl.start, '__export = ');

  // Strict mode, like the ES module the author wrote. The prefix has no newline, so lines stay aligned.
  const code = `(function(){"use strict";let __lg=0;const __lgc=__loci.overtime;let __export;${s.toString()}\n;__loci.define(__export);})();`;
  return { code, meta: decl.type === 'ObjectExpression' ? extractMeta(decl) : {} };
}

function propName(p) {
  if (p.computed) return null;
  if (p.key.type === 'Identifier') return p.key.name;
  if (p.key.type === 'Literal') return String(p.key.value);
  return null;
}

/** Plain data from literals only (strings, numbers, booleans, arrays, objects); anything else is skipped. */
function literal(node) {
  switch (node.type) {
    case 'Literal': return ['string', 'number', 'boolean'].includes(typeof node.value) ? node.value : undefined;
    case 'UnaryExpression': return node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number' ? -node.argument.value : undefined;
    case 'TemplateLiteral': return node.expressions.length === 0 ? node.quasis[0].value.cooked : undefined;
    case 'ArrayExpression': {
      const out = node.elements.map(e => (e ? literal(e) : undefined));
      return out.every(v => v !== undefined) ? out : undefined;
    }
    case 'ObjectExpression': {
      const out = {};
      for (const p of node.properties) {
        if (p.type !== 'Property' || p.kind !== 'init' || p.method) continue;
        const k = propName(p), v = literal(p.value);
        if (k !== null && v !== undefined) out[k] = v;
      }
      return out;
    }
    default: return undefined;
  }
}

function extractMeta(obj) {
  const meta = {};
  for (const p of obj.properties) {
    if (p.type !== 'Property') continue;
    const k = propName(p);
    if (!['title', 'hook', 'tags', 'license', 't0', 'param'].includes(k)) continue;
    const v = literal(p.value);
    if (v !== undefined) meta[k] = v;
  }
  if (meta.tags && !(Array.isArray(meta.tags) && meta.tags.every(t => typeof t === 'string'))) delete meta.tags;
  return meta;
}
