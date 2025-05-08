export type GenAIStripeAPICallResponse = {
  status: "incomplete" | "complete";
  reason?: string;
  missing?: string[];
  tool?: string;
  request?: {
    method: "GET" | "POST" | "DELETE";
    url: string;
    headers: Record<string, string>;
    queryParams: Record<string, string>;
    body: Record<string, string>;
  };
};

export const constructStripeAPICall = async (
  response: GenAIStripeAPICallResponse
) => {
  if (!response.request) {
    throw new Error("No request found in response");
  }

  const { method, url, queryParams, body } = response.request;

  const isBodyMethod = method.toUpperCase() === "POST";
  const isDeleteWithBody =
    method.toUpperCase() === "DELETE" && body && Object.keys(body).length > 0;

  const requestOptions: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_API_TOKEN}`,
      ...(isBodyMethod || isDeleteWithBody
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    ...(isBodyMethod || isDeleteWithBody
      ? { body: new URLSearchParams(body).toString() }
      : {}),
  };

  const fullUrl =
    method === "GET" && queryParams
      ? `${url}?${new URLSearchParams(queryParams).toString()}`
      : url;

  const res = await fetch(fullUrl, requestOptions);

  return await res.json();
};
