# MUFON Last 20 Reports BOT (v1 beta)
## for mastodon

### Setup
* run npm install
* Need a .env file with ACCESSKEY set to your mastodon application accesskey
* set cron task to how many times you want it to post/run

### Bugs/Dev

**FIXED 11/11/22** ~~Right now get sightings and post sighting not running in needed order. Will fix but from async/await issues.~~

Issue fixed by separating getting sightings and tooting sightings into separate scripts. Will need to run as

```
node get_sightings.js && node toot_sightings.js
```