# Discord OAuth2 implementation notes

Discord OAuth2 supports the Authorization Code grant. The authorization URL is `https://discord.com/oauth2/authorize`; the token endpoint is `https://discord.com/api/oauth2/token` and accepts only `application/x-www-form-urlencoded`. The flow needs a registered Discord application, its client ID/client secret, a registered redirect URI, an unpredictable `state` value that is validated on return, and a `POST` token exchange with `grant_type=authorization_code`, `code`, and the identical `redirect_uri`.

For FrierenCloud, request the minimum `identify` scope. Calling `GET https://discord.com/api/v10/users/@me` with the OAuth Bearer token returns the Discord user object for this scope. The bridge must not record the Discord access token, refresh token, OAuth code, client secret, GitHub token, or HTTP Authorization header in audit logs.

Sources:

- [Discord OAuth2 documentation](https://docs.discord.com/developers/topics/oauth2)
- [Discord User resource: Get Current User](https://docs.discord.com/developers/resources/user)
