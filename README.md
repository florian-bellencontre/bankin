[Cozy][cozy] Konnector Bankin'
=======================================

What's Cozy?
------------

![Cozy Logo](https://cdn.rawgit.com/cozy/cozy-guidelines/master/templates/cozy_logo_small.svg)

[Cozy] is a personal data platform that brings all your web services in the same private space. With it, your webapps and your devices can share data easily, providing you with a new experience. You can install Cozy on your own hardware where no one's tracking you.

What is this konnector about ?
------------------------------

This konnector retrieves your financial data from Bankin' to use in the Cozy Bank app.

### How it works (since v2.0.0)

Bankin' now puts an hCaptcha in front of `/v2/authenticate`, and it is a hard
gate: the challenge is checked *before* the credentials, so even a wrong
password answers `challenge_required`. A server cannot log in any more.

The konnector is therefore **client-side** (`clientSide: true`) and runs in two
halves, under a single slug:

1. **`src/client.js`** runs in the flagship app webview. It opens the Bankin'
   login page, the user signs in and solves the captcha themselves, then it
   calls the Bankin' API **from the phone**. Every request to Bankin' comes
   from the user's own IP with the webview user agent, like a normal use of
   the app — nothing is replayed from a datacenter.
2. **`src/index.js`** runs on the server. The client half leaves the collected
   data in the account (`saveAccountData`) and starts it with `runServerJob`;
   it only writes the `io.cozy.bank.*` documents, which the clisk bridge
   cannot do itself.

Two consequences worth knowing:

- the Bankin' access token lives **2 hours** and there is no refresh token, so
  the konnector is meant to be **run manually**, not on a daily trigger;
- `runServerJob` is a recent addition to the flagship app: an older
  Twake/Cozy app will fail with an "unknown method" error.

`src/index.js` keeps its own API code path for standalone runs, but it hits
the captcha wall on a real account.

### Open a Pull-Request

If you want to work on this konnector and submit code modifications, feel free to open pull-requests!
</br>See :
* the [contributing guide][contribute] for more information about how to properly open pull-requests.
* the [konnectors development guide](https://docs.cozy.io/en/dev/konnector/)

### Run and test

Create a `konnector-dev-config.json` file at the root with your test credentials :

```json
{
  "COZY_URL": "http://cozy.tools:8080",
  "fields": {
    "email": "zuck.m@rk.fb",
    "password": "123456",
    "clientId": "BANKIN_CLIENT_ID",
    "clientSecret": "BANKIN_CLIENT_SECRET"
  }
}
```
Then :

```sh
yarn
yarn standalone
```
For running the konnector connected to a Cozy server and more details see [konnectors documentation](https://docs.cozy.io/en/dev/konnector/)

### Cozy-konnector-libs

This connector uses [cozy-konnector-libs](https://github.com/cozy/cozy-konnector-libs). It brings a bunch of helpers to interact with the Cozy server and to fetch data from an online service.

### Maintainer

The lead maintainers for this konnector is [Naji](https://github.com/na-ji)


### Get in touch

You can reach the Cozy Community by:

- [konnectors documentation](https://docs.cozy.io/en/dev/konnector/)
- Chatting with us on IRC [#cozycloud on Libera.Chat][libera]
- Posting on our [Forum]
- Posting issues on the [Github repos][github]
- Say Hi! on [Twitter]


License
-------

cozy-konnector-bankin is developed by Naji and distributed under the [AGPL v3 license][agpl-3.0].

[cozy]: https://cozy.io "Cozy Cloud"
[agpl-3.0]: https://www.gnu.org/licenses/agpl-3.0.html
[libera]: https://web.libera.chat/#cozycloud
[forum]: https://forum.cozy.io/
[github]: https://github.com/cozy/
[nodejs]: https://nodejs.org/
[standard]: https://standardjs.com
[twitter]: https://twitter.com/mycozycloud
[webpack]: https://webpack.js.org
[yarn]: https://yarnpkg.com
[travis]: https://travis-ci.org
[contribute]: CONTRIBUTING.md
