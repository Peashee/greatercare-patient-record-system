import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";

Amplify.configure(outputs);

/**
 * Every GraphQL request is authorised with the Cognito *ID* token rather than
 * the access token. The ID token carries the `email` claim, which the
 * owner-based rules (`ownerDefinedIn('patientEmail').identityClaim('email')`)
 * need, as well as `cognito:groups` for the group-based rules.
 */
export const client = generateClient({
  authMode: "userPool",
  headers: async () => {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    return idToken ? { Authorization: idToken } : {};
  },
});

/** Throws the first GraphQL error, otherwise returns `data`. */
export function unwrap(result, fallbackMessage = "The request could not be completed.") {
  if (result?.errors?.length) {
    throw new Error(result.errors[0].message || fallbackMessage);
  }
  return result?.data;
}

/** Custom operations return AWSJSON, which arrives as a string. */
export function parseJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/** Reads every page of a model list. */
export async function listAll(model, options = {}) {
  const items = [];
  let nextToken;
  do {
    const result = await model.list({ limit: 200, ...options, nextToken });
    unwrap(result);
    items.push(...(result.data ?? []));
    nextToken = result.nextToken;
  } while (nextToken);
  return items;
}

/** True once the backend has been deployed with the given model. */
export function hasModel(name) {
  return Boolean(client.models?.[name]);
}

/**
 * Returns a custom query/mutation, or throws a clear message when
 * amplify_outputs.json predates it (i.e. the backend hasn't been redeployed).
 */
export function operation(kind, name) {
  const fn = client[kind]?.[name];
  if (typeof fn !== "function") {
    throw new Error(
      `The backend operation "${name}" isn't deployed yet. Run "npx ampx sandbox" to deploy the latest backend and regenerate amplify_outputs.json, then restart the dev server.`
    );
  }
  return fn;
}
