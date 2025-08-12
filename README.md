# Saihex Studios' QueryWife

---

<center>
<img width="512" alt="SaihexWare Collection Logo" src="https://s3.saihex.com/public/logos/saihexware.svg"/>
</center>

---

**QueryWife** is a lightweight Deno server application that acts as a pooled connection layer between your services and your PostgreSQL database. Think of it as your reliable middleman (or middlewoman, if you prefer) that prevents database overload by pooling connections efficiently—especially useful for edge deployments with multiple instances.

The server listens on port `8080` and applies the same query handling logic for all endpoints except `/health`, which is reserved for Docker health checks. In production, QueryWife runs as a standalone binary, minimizing the risk of runtime code injection or hijacking.

It also features an automatic restart every 48 hours by exiting with code `1`, relying on Docker’s restart policy (usually `on-failure`) to keep it fresh and stable.

> ⚠️ **Warning:** QueryWife is designed for internal use behind proper authentication. It will execute *any* SQL query it receives, faithfully and without question—like a loyal wife following your commands. Use with caution!

---

### Configuration

QueryWife reads configuration from the following environment variables:

- `POSTGRES_HOSTNAME`  
  The hostname or IP address of the PostgreSQL database server.

- `POSTGRES_DATABASE`  
  The name of the specific PostgreSQL database to connect to.

- `POSTGRES_USER`  
  The username used to authenticate with the PostgreSQL server.

- `POSTGRES_PASSWORD`  
  The password for the PostgreSQL user.

- `POOL_SIZE`  
  The maximum number of connections to maintain in the database connection pool.

---

### Health Check

You can verify that QueryWife and the database connection are healthy by making a GET request to:

```
http://<querywife-host>:8080/health
```

A healthy response returns:

```
I'm alright, honey!
```

---

### Usage Notes

- QueryWife expects requests with a JSON body containing:  
  - `query`: The SQL query string.  
  - `values`: An array of parameters to bind in the query.

- All responses return JSON arrays of result rows.

- Binary fields (e.g., PostgreSQL `BYTEA`) will be serialized as Base64 strings.
