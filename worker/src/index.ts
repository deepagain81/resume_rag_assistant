export interface Env {
	QUERY_CACHE: KVNamespace;
	RESUME_BUCKET: R2Bucket;
	//   OPENAI_API_KEY: string;
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
}

export default {
	async fetch(request: Request, _env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "GET" && url.pathname === "/health") {
			return jsonResponse({ status: "ok" });
		}

		if (request.method === "POST" && url.pathname === "/api/query") {
			return jsonResponse({
				answer: "Worker query route is ready.",
				source: "stub",
			});
		}

		return jsonResponse({ error: "Not found" }, 404);
	},
};
