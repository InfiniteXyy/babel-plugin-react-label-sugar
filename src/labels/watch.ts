import { Node } from "@babel/core";
import { Scope } from "@babel/traverse";
import {
  arrayExpression,
  arrowFunctionExpression,
  callExpression,
  Expression,
  identifier,
  Identifier,
  isArrowFunctionExpression,
  isAssignmentExpression,
  isIdentifier,
  Pattern,
  RestElement,
  TSParameterProperty,
  variableDeclaration,
  variableDeclarator,
} from "@babel/types";

import { PluginOptions } from "../types";
import { DefaultEffectFactory, DefaultMemoFactory } from "../constant";

export default function handleWatchLabel(
  expression: Expression,
  scope: Scope,
  options: PluginOptions,
  onSuccess: (newBody: Node) => void
) {
  const { memoFactory = DefaultMemoFactory, effectFactory = DefaultEffectFactory } = options;
  if (!isAssignmentExpression(expression) && !isArrowFunctionExpression(expression)) {
    throw new Error("watch sugar must be an assignment or arrow function");
  }
  if (isArrowFunctionExpression(expression)) {
    // useEffect
    if (!validateArrowDeps(expression.params)) throw new Error("watch sugar arrow deps can only be identify");
    onSuccess(
      callExpression(identifier(effectFactory), [
        arrowFunctionExpression([], expression.body),
        arrayExpression(expression.params),
      ])
    );
  } else {
    // useMemo
    if (!isArrowFunctionExpression(expression.right)) {
      throw new Error("watch sugar assign right must be an arrow function");
    }
    if (!isIdentifier(expression.left)) {
      throw new Error("watch sugar assign left must be an identify");
    }
    if (!validateArrowDeps(expression.right.params)) throw new Error("watch sugar arrow deps can only be identify");
    onSuccess(
      variableDeclaration("const", [
        variableDeclarator(
          expression.left,
          callExpression(identifier(memoFactory), [
            arrowFunctionExpression([], expression.right.body),
            arrayExpression(expression.right.params),
          ])
        ),
      ])
    );
  }
}

function validateArrowDeps(
  params: Array<Identifier | Pattern | RestElement | TSParameterProperty>
): params is Array<Identifier> {
  return params.every((i) => isIdentifier(i));
}
