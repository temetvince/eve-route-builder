export interface AdditionalSystem {
  name: string;
  systemId: number;
  security: number;
  neighbors: number[];
}

export type Route<SystemId extends string | number = string> = {
  origin: SystemId;
  destination: SystemId;
};

export type RouteResult<SystemId extends string | number = string> = {
  systems: number[];
  success: boolean;
} & Route<SystemId>;
export type StopCondition = (args: { ends: number[]; foundTargets: Set<number>; current?: number }) => boolean;
