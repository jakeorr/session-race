Testcase
===

**update:** This test has been updated to include passportjs and a basic authentication flow. The issue is similar to the one described below, but instead of a date stamp being saved in the session, it is the passport serialized user that is being saved. The complication here is that the session data is being set inside the passport module.

**solution:** The solution I'm settling on at this point is to use the `req.session.save(cb)` function after authentication and redirect inside the callback. This should be done anywhere that session data could cause race conditions. Whew.

This project tests what appears to be a bug between connect-session-sequelize and the current version of express-session.

The Issue
---
What I'm doing is setting a session variable in `endpoint1` and then redirecting to `endpoint2` and checking for that session variable. The session is stored in Postgres using connect-session-sequelize. With newer version of express-session I do not see the session variable in `endpoint2`. Checking in the DB, I can see the session variable has been set. If I access `endpoint2` directly, the session variable is set. It seems that the redirect from `endpoint1` to `endpoint2` is completing *before* the new session is being saved to the DB. This is an issue because when `endpoint2` accesses the session variable it does not see the value that was set in the previous endpoint.

Setup
---
Change the variables for db, user/password, and host that are passed into the Sequelize contructor to values for your database. Make sure you are connecting to a remote DB. Connecting to a DB on `localhost` does not reproduce the problem.

Run the server with `node index.js`.

Steps to reproduce
---
1. Make sure you have a newer version of express-session installed (1.8.2 does it)
2. Access `localhost:3000/`
3. You will see console output of the session variable being saved
4. The request redirects you to `localhost:3000/check` where you will see the contents of your session
5. The returned session will not contain the session variable output to the console in 3
6. To see again, repeat from step 2.

Working comparison
---
Here is a version of the steps where the problem does not occur for comparison:

1. Install an older version of express-session (1.2.1 will work)
2. Repeat steps above starting at step 2.
3. The session returned in step 5 will contain the variable that was output to the console.

