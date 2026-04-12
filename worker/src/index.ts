export interface Env {
	QUERY_CACHE: KVNamespace;
	RESUME_BUCKET: R2Bucket;
	OPENAI_API_KEY: string;
	DATASET_VERSION: string;
}

function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
}

async function handleHealth(env: Env): Promise<Response> {
	return jsonResponse({
		status: "ok",
		datasetVersion: env.DATASET_VERSION,
	});
}

async function handleQuery(env: Env): Promise<Response> {
	return jsonResponse({
		answer: "Worker query route is ready.",
		source: "stub",
		datasetVersion: env.DATASET_VERSION,
	});
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		switch (`${request.method}_${url.pathname}`) {
			case "GET_/health":
				return handleHealth(env);

			case "POST_/api/query":
				return handleQuery(env);

			default:
				return jsonResponse({ error: "Not found" }, 404);
		}
	},
};
