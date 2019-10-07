# YARCO
*A GreaseMonkey script to allow you to overwrite and delete your Reddit comments in bulk*

This is a local script to overwrite all your comments with random ASCII characters and then delete them. This works because Reddit doesn't store editing history, so technically this is the only way to obfuscate the contents of the comments. Deleted comments on reddit aren't really deleted, but overwriting comments and deleting them after a while should allow for external caching to be defeated as well, as long as they don't store edit history themselves. 

The script only deletes comments that are loaded onto the page, if you have RES scroll down until you can't load comments anymore and only then trigger the script. Due to a Reddit limitation, you can only delete your most recent 1000 comments. 

This is essentially [Reddit Overwrite script v.1.4.8](https://greasyfork.org/en/scripts/10380-reddit-overwrite) with a number of modifications. This repo exists because I couldn't really find a central repository for this script and I wanted to add my own tweaks to how it works (primarily remove the ad message).

**Features (inactive by default):**
* Overwrite and delete all comments *(active by default)*
* Separate overwrite and delete functionality, for all comments or each comment
* Ignore comments newer than specified limit (default 1 day)
* Delete comments from only a specific subreddit
* Delete comments based on karma (target only downvoted comments or ignore upvoted comments)
* Automatically delete comments when visiting comments page (to be used with the filters above)

You can use it as is in Firefox or use something like TamperMonkey to install it in Chrome. It probably only works on the old version on reddit, and it's meant to be used on your comments page. It might get stuck on posts, so I have currently restricted it to the comments page only.

To preempt criticism regarding the existence of such a script, I feel reddit doesn't belong to anyone but its users, and everyone should be allowed to remove their own contributions to the site in an easy manner. The script just automates something anyone could do on their own. 
