(() => {
  // helpers.js
  var StorageManagerAuthError = class extends Error {
    constructor(message) {
      super(message);
      this.name = this.constructor.name;
    }
  };

  // pools.js
  var Pool = class {
    constructor(mgr, name) {
      this.mgr = mgr;
      this.name = name;
    }
    static async create(mgr, name, distribute_groups, opts) {
      return await mgr.httpPost(`/api/v1/pools`, {
        name,
        distribute_groups,
        no_start: opts["no_start"] !== void 0 ? opts["no_start"] : false,
        distribute: opts["distribute"] !== void 0 ? opts["distribute"] : false,
        pool_id: opts["pool_id"] !== void 0 ? opts["pool_id"] : "",
        auto_add_nodes: opts["auto_add_nodes"] !== void 0 ? opts["auto_add_nodes"] : false,
        options: opts["options"] !== void 0 ? opts["options"] : {}
      });
    }
    static async list(mgr, state = false) {
      return await mgr.httpGet(`/api/v1/pools?state=${state ? 1 : 0}`);
    }
    async get(state = false) {
      return await this.mgr.httpGet(
        `/api/v1/pools/${this.name}?state=${state ? 1 : 0}`
      );
    }
    async start() {
      return await this.mgr.httpPost(
        `/api/v1/pools/${this.name}/start`,
        {}
      );
    }
    async stop() {
      return await this.mgr.httpPost(
        `/api/v1/pools/${this.name}/stop`,
        {}
      );
    }
    async rename(newName) {
      return this.mgr.httpPost(
        `/api/v1/pools/${this.name}/rename`,
        { new_name: newName }
      );
    }
    async delete() {
      return this.mgr.httpDelete(
        `/api/v1/pools/${this.name}`
      );
    }
  };

  // users.js
  var User = class {
    constructor(mgr, username) {
      this.mgr = mgr;
      this.username = username;
    }
    static async create(mgr, username, password, fullName = "") {
      return await mgr.httpPost("/api/v1/users", {
        name: fullName,
        username,
        password
      });
    }
    static async hasUsers(mgr) {
      return await mgr.httpGet("/api/v1/user-exists", true);
    }
  };

  // nodes.js
  var Node = class {
    constructor(mgr, name) {
      this.mgr = mgr;
      this.name = name;
    }
    static async add(mgr, name, endpoint = "") {
      return await mgr.httpPost(
        `/api/v1/nodes`,
        { name, endpoint }
      );
    }
    static async list(mgr, state = false) {
      return await mgr.httpGet(`/api/v1/nodes?state=${state ? 1 : 0}`);
    }
    async get(state = false) {
      return await this.mgr.httpGet(
        `/api/v1/nodes/${this.name}?state=${state ? 1 : 0}`
      );
    }
    async remove() {
      return this.mgr.httpDelete(
        `/api/v1/nodes/${this.name}`
      );
    }
  };

  // kadalu_storage.js
  var StorageManager = class {
    constructor(url) {
      this.url = url;
      this.user_id = "";
      this.api_key_id = "";
      this.token = "";
    }
    async httpPost(urlPath, body) {
      const response = await fetch(
        `${this.url}${urlPath}`,
        {
          method: "POST",
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        }
      );
      if (response.status == 401 || response.status == 403) {
        throw new StorageManagerAuthError((await response.json()).error);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    }
    async httpGet(urlPath, existsCheck = false) {
      const response = await fetch(
        `${this.url}${urlPath}`,
        {
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json"
          }
        }
      );
      if (response.status == 401 || response.status == 403) {
        throw new StorageManagerAuthError((await response.json()).error);
      }
      if (existsCheck) {
        return response.status == 200 ? true : false;
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data;
    }
    async httpDelete(urlPath) {
      const response = await fetch(
        `${this.url}${urlPath}`,
        {
          method: "DELETE",
          headers: {
            ...this.authHeaders(),
            "Content-Type": "application/json"
          }
        }
      );
      if (response.status == 401 || response.status == 403) {
        throw new StorageManagerAuthError((await response.json()).error);
      }
      if (response.status !== 204) {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
      }
      return;
    }
    static fromToken(url, user_id, api_key_id, token) {
      const mgr = new StorageManager(url);
      mgr.user_id = user_id;
      mgr.api_key_id = api_key_id;
      mgr.token = token;
      return mgr;
    }
    authHeaders() {
      if (this.token != "") {
        return {
          "Authorization": `Bearer ${this.token}`,
          "X-User-ID": this.user_id
        };
      }
      return {};
    }
    async generateApiKey(username, password) {
      return await this.httpPost(
        `/api/v1/users/${username}/api-keys`,
        { password }
      );
    }
    static async login(url, username, password) {
      const mgr = new StorageManager(url);
      const data = await mgr.generateApiKey(username, password);
      mgr.user_id = data.user_id;
      mgr.api_key_id = data.id;
      mgr.token = data.token;
      return mgr;
    }
    async logout() {
      if (this.api_key_id == "") {
        return;
      }
      await this.httpDelete(`/api/v1/api-keys/${this.api_key_id}`);
      this.api_key_id = "";
      this.user_id = "";
      this.token = "";
      return;
    }
    async listPools(state = false) {
      return await Pool.list(this, state);
    }
    pool(name) {
      return new Pool(this, name);
    }
    node(name) {
      return new Node(this, name);
    }
    async addNode(name, endpoint = "") {
      return await Node.add(this, name, endpoint);
    }
    async listNodes(state = false) {
      return await Node.list(this, state);
    }
    async createPool(name, distribute_groups, opts) {
      return await Pool.create(this, name, distribute_groups, opts);
    }
    async createUser(username, password, fullName = "") {
      return await User.create(this, username, password, fullName);
    }
    async hasUsers() {
      return await User.hasUsers(this);
    }
    user(username) {
      return new User(this, username);
    }
  };

  // main_browser.js
  window.StorageManager = StorageManager;
  window.StorageManagerAuthError = StorageManagerAuthError;
})();
