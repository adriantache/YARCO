# YARCO
*A GreaseMonkey script to allow you to overwrite and delete your Reddit comments in bulk*

This is a local script to overwrite all your comments with random ASCII characters and then delete them. This works because Reddit doesn't store editing history, so technically this is the only way to obfuscate the contents of the comments. Deleted comments on reddit aren't really deleted, but overwriting comments and deleting them after a while should allow for external caching to be defeated as well, as long as they don't store edit history themselves. 

The script only deletes comments that are loaded onto the page, if you have RES scroll down until you can't load comments anymore and only then trigger the script. Due to a Reddit limitation, you can only delete your most recent 1000 comments. 

This is essentially [Reddit Overwrite script v.1.4.8](https://greasyfork.org/en/scripts/10380-reddit-overwrite) with a number of modifications. 

You can use it as such in Firefox or use something like TamperMonkey to install it in Chrome.

This repo exists because I couldn't really find a central repository for this script and I wanted to add my own tweaks to how it works (primarily remove the ad message).

To preempt criticism regarding the existence of such a script, I feel reddit doesn't belong to anyone but its users, and everyone should be allowed to remove their own contributions to the site in an easy manner. The script just automates something anyone could do on their own. 
