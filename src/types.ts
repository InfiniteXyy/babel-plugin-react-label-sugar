import { Identifier } from "@babel/types";
import { Scope } from "@babel/traverse";

export type PluginOptions = {
  refLabel?: string;
  watchLabel?: string;
  stateFactory?: string;
  memoFactory?: string;
  effectFactory?: string;
  ignoreMemberExpr?: boolean;
};

export type ReactRefItem = { identify: Identifier; modifier: Identifier; scope: Scope };
export type ReactRefs = ReactRefItem[];
export type ReactRefsState = { reactRefs?: ReactRefs };
