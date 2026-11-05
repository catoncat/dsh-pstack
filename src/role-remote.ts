/**
 * Remote metadata for the pstack role settings page.
 *
 * The Host registers these descriptors with Typert and the Client mounts the
 * same contribution. Everything here is plain metadata; this module never
 * imports a runtime package, so it is safe to bundle for the browser.
 */

import type {
  InvocationDescriptor,
  InvocationParameterDescriptor,
  RemoteResult,
  TypertClientRemote,
  TypertCodec,
  TypertRemoteContribution,
  TypertRemoteInfo,
  TypertRemoteMethod,
  TypertSchema,
} from "@deepseek-ai/dsh-typert-protocol";

/** npm package owning these methods. */
export const REMOTE_PACKAGE = "dsh-pstack";

/** Cordis service key and wire namespace. */
export const ROLES_SERVICE = "pstackRoles";

type StrictCodec<Value> = Extract<TypertCodec<Value>, { readonly mode: "strict" }>;

function codec<Value>(typeSymbol: string): StrictCodec<Value> {
  return {
    mode: "strict",
    typeSymbol,
    create: (): TypertSchema<Value> => ({
      parse(value: unknown): Value {
        return value as Value;
      },
    }),
  };
}

function parameter(name: string, typeSymbol: string): InvocationParameterDescriptor {
  return { name, wire: name, source: "json", codec: codec(typeSymbol) };
}

interface DirectOptions<Input extends object, Output> {
  readonly method: string;
  readonly parameters: readonly InvocationParameterDescriptor[];
  readonly result: StrictCodec<Output>;
  readonly cancellation?: boolean;
  readonly invoke: (
    remote: TypertClientRemote,
    input: Input,
    signal?: AbortSignal,
  ) => Promise<RemoteResult<Output>>;
}

function directMethod<Input extends object, Output>(
  options: DirectOptions<Input, Output>,
): TypertRemoteMethod<Input, Output> {
  const descriptor: InvocationDescriptor = {
    id: `${REMOTE_PACKAGE}#${ROLES_SERVICE}/${options.method}`,
    service: ROLES_SERVICE,
    namespace: ROLES_SERVICE,
    method: options.method,
    invocation: { kind: "direct" },
    parameters: options.parameters,
    result: options.result,
    ...(options.cancellation === true ? { cancellation: { parameter: "signal" } } : {}),
  };
  const method = {
    ...descriptor,
    input(): { create: () => TypertSchema<Input> } {
      return {
        create: () => ({
          parse(value: unknown): Input {
            if (typeof value !== "object" || value === null || Array.isArray(value)) {
              throw new TypeError("the method input must be an object");
            }
            return value as Input;
          },
        }),
      };
    },
    invoke(
      remote: TypertClientRemote,
      input: Input,
      signal?: AbortSignal,
    ): Promise<RemoteResult<Output>> {
      const namespace = Reflect.get(remote as object, ROLES_SERVICE) as Record<
        string,
        (...args: unknown[]) => Promise<RemoteResult<Output>>
      >;
      const values = options.parameters.map(
        (item) => (input as Record<string, unknown>)[item.wire],
      );
      if (options.cancellation === true) values.push(signal);
      return namespace[options.method]!(...values);
    },
  };
  return method as TypertRemoteMethod<Input, Output>;
}

const statusMethod = directMethod<Record<string, never>, unknown>({
  method: "status",
  parameters: [],
  result: codec("PstackRoleFileSnapshot"),
  invoke: (remote) => (remote as unknown as PstackRolesNamespace).pstackRoles.status(),
});

const catalogueMethod = directMethod<Record<string, never>, unknown>({
  method: "catalogue",
  parameters: [],
  result: codec("PstackRoleCatalogue"),
  cancellation: true,
  invoke: (remote, _input, signal) =>
    (remote as unknown as PstackRolesNamespace).pstackRoles.catalogue(signal),
});

const saveMethod = directMethod<Record<string, unknown>, unknown>({
  method: "save",
  parameters: [parameter("request", "PstackSaveRoleRequest")],
  result: codec("PstackSaveRoleResult"),
  cancellation: true,
  invoke: (remote, input, signal) =>
    (remote as unknown as PstackRolesNamespace).pstackRoles.save(input, signal),
});

const saveBudgetMethod = directMethod<Record<string, unknown>, unknown>({
  method: "saveBudget",
  parameters: [parameter("request", "PstackSaveBudgetRequest")],
  result: codec("PstackSaveBudgetResult"),
  invoke: (remote, input) =>
    (remote as unknown as PstackRolesNamespace).pstackRoles.saveBudget(input),
});

/** Typed Client face installed by `$mount()`. */
export interface PstackRolesNamespace {
  readonly pstackRoles: {
    status(): Promise<RemoteResult<unknown>>;
    catalogue(signal?: AbortSignal): Promise<RemoteResult<unknown>>;
    save(request: unknown, signal?: AbortSignal): Promise<RemoteResult<unknown>>;
    saveBudget(request: unknown): Promise<RemoteResult<unknown>>;
  };
}

/** Mountable contribution shared by Host registration and Client `$mount`. */
export const pstackRolesRemote: TypertRemoteInfo = {
  package: REMOTE_PACKAGE,
  descriptors: [
    statusMethod,
    catalogueMethod,
    saveMethod,
    saveBudgetMethod,
  ] as InvocationDescriptor[],
  methods: {
    [`${ROLES_SERVICE}/status`]: statusMethod,
    [`${ROLES_SERVICE}/catalogue`]: catalogueMethod,
    [`${ROLES_SERVICE}/save`]: saveMethod,
    [`${ROLES_SERVICE}/saveBudget`]: saveBudgetMethod,
  } as TypertRemoteInfo["methods"],
};

/** Same contribution typed for the Host side. */
export const pstackRolesContribution: TypertRemoteContribution = pstackRolesRemote;
