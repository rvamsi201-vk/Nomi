/**
 * Thin HTTP client for Nomi REST APIs (Bearer token auth).
 */

export class NomiClient {
  /**
   * @param {{ baseUrl: string, token: string }} opts
   */
  constructor(opts) {
    this.baseUrl = String(opts.baseUrl || "").replace(/\/$/, "");
    this.token = opts.token;
    if (!this.baseUrl) throw new Error("NOMI_BASE_URL is required");
    if (!this.token) throw new Error("NOMI_API_TOKEN is required");
  }

  /**
   * @param {string} method
   * @param {string} path
   * @param {{ body?: unknown, query?: Record<string, string | undefined> }} [opts]
   */
  async request(method, path, opts = {}) {
    const url = new URL(this.baseUrl + path);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
      }
    }

    const headers = {
      Authorization: `Bearer ${this.token}`,
      Accept: "application/json",
    };
    /** @type {RequestInit} */
    const init = { method, headers };
    if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(opts.body);
    }

    const res = await fetch(url, init);
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!res.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        `${method} ${path} failed with ${res.status}`;
      const err = new Error(String(msg));
      // @ts-ignore
      err.status = res.status;
      // @ts-ignore
      err.data = data;
      throw err;
    }
    return data;
  }

  listProjects() {
    return this.request("GET", "/api/projects");
  }

  createProject(body) {
    return this.request("POST", "/api/projects", { body });
  }

  getProjectMembers(projectId) {
    return this.request("GET", `/api/projects/${projectId}/members`);
  }

  setProjectMembers(projectId, memberIds) {
    return this.request("PUT", `/api/projects/${projectId}/members`, {
      body: { memberIds },
    });
  }

  listTasks() {
    return this.request("GET", "/api/tasks");
  }

  createTask(body) {
    return this.request("POST", "/api/tasks", { body });
  }

  updateTask(id, body) {
    return this.request("PATCH", `/api/tasks/${id}`, { body });
  }

  deleteTask(id) {
    return this.request("DELETE", `/api/tasks/${id}`);
  }

  bulkTasks(body) {
    return this.request("POST", "/api/tasks/bulk", { body });
  }

  listChannels() {
    return this.request("GET", "/api/channels");
  }

  createChannel(body) {
    return this.request("POST", "/api/channels", { body });
  }

  listMessages(channelId, after) {
    return this.request("GET", `/api/channels/${channelId}/messages`, {
      query: { after },
    });
  }

  postMessage(channelId, text) {
    return this.request("POST", `/api/channels/${channelId}/messages`, {
      body: { text },
    });
  }

  markRead(channelId) {
    return this.request("POST", `/api/channels/${channelId}/read`);
  }

  listDms() {
    return this.request("GET", "/api/dms");
  }

  startDm(userId) {
    return this.request("POST", "/api/dms", { body: { userId } });
  }

  listTeam() {
    return this.request("GET", "/api/team");
  }

  listUsers() {
    return this.request("GET", "/api/users");
  }

  unread() {
    return this.request("GET", "/api/unread");
  }

  presence() {
    return this.request("GET", "/api/presence");
  }
}

export function clientFromEnv() {
  return new NomiClient({
    baseUrl: process.env.NOMI_BASE_URL || "http://127.0.0.1:3002",
    token: process.env.NOMI_API_TOKEN || "",
  });
}
