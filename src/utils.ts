import { ReactRefItem, ReactRefs } from "./types";
import {
  arrowFunctionExpression,
  blockStatement,
  callExpression,
  expressionStatement,
  isIdentifier,
  isMemberExpression,
  MemberExpression,
} from "@babel/types";
import { NodePath } from "@babel/core";
import { Scope } from "@babel/traverse";

export function capitalize(str: string): string {
  if (str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get target value from "Identifier" or "MemberExpression"
 * eg: a = 1;          =>  a
 * eg: obj.value = 1;  =>  obj
 */
export function getTargetRef(leftValue: object | null | undefined, refs: ReactRefs): ReactRefItem | undefined {
  if (!isIdentifier(leftValue) && !isMemberExpression(leftValue)) return undefined;
  if (isIdentifier(leftValue)) {
    const target = leftValue.name;
    return refs.find((ref) => ref.identify.name === target);
  } else {
    return getTargetRef(leftValue.object, refs);
  }
}

/**
 * move member expression to setState callback;
 * eg: obj.value = 1;  =>  setState(obj => { obj.value = 1 });
 */
export function handleMemberExpression(node: MemberExpression, ref: ReactRefItem, path: NodePath<any>) {
  if (node.extra?.REACT_REF_HAS_SETTED) return;
  path.replaceWith(
    callExpression(ref.modifier, [
      arrowFunctionExpression([ref.identify], blockStatement([expressionStatement(path.node)])),
    ])
  );
  node.extra ??= {};
  node.extra.REACT_REF_HAS_SETTED = true;
}

/**
 * check if ref binding has be override in current scope
 * check if ref is not included in current scope
 */
export function isRefInTargetScope(scope: Scope | undefined, ref: ReactRefItem): boolean {
  if (!scope) return false;

  if (scope === ref.scope) return true;
  // if has overwritten ref in the path, return false;
  if (scope.bindings[ref.identify.name]) return false;

  return isRefInTargetScope(scope.parent, ref);
}
