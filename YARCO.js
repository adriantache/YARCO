// ==UserScript==
// @name        Yet Another Reddit Comment Overwriter
// @namespace   https://github.com/adriantache/YARCO/
// @description Local script to overwrite all your comments with random ASCII characters and delete them. This works because Reddit doesn't store editing history, so technically this is the only way to obfuscate the contents of the comments. Based on Reddit Overwrite script v.1.4.8.
// @include     https://*.reddit.com/user/*/comments/
// @include     http://*.reddit.com/user/*/comments/
// @version     0.3
// @run-at      document-start
// ==/UserScript==


//EXTRA OPTIONS (disabled by default)
let set_default_settings = false //set the default options I use [[overrides all the below]]

let show_overwrite_button = false //show separate button to overwrite 
let show_delete_button = false //show separate button to delete
let generate_individual_delete_buttons = false //generate per comment delete and overwrite links
let only_delete_old_comments = false //ignore comments newer than the limit below
let old_comments_limit = 2 //if above is active, number of days after which a comment is considered old
let only_delete_by_subreddit = false //ignore comments from subreddits other than the one chosen in the dropdown
let time_between_actions = 2000 //reddit API limit is 60 actions per minute so don't exceed that
let only_delete_downvoted = false //only delete comments under a certain karma
let downvote_limit = -1 //if above is active, only delete comments with karma <= to this
let ignore_upvoted = false //ignore comments over a certain karma (useless if only_delete_downvoted is active)
let upvote_limit = 50 //if above is active, ignore comments with karma >= to this
let auto_delete = false //automatically delete comments when navigating to comments page [[USE WITH FILTERS!]]
let reload_on_completion = false //reload page on completion
let highlight_comments = false //highlight comments selected for deletion

//DEBUG
let safeMode = false //process comments without performing any actions, used for debugging

// TODO add STOP button
// TODO add optional confirmation dialog OR start up delay
// TODO add logic to avoid posts and enable using script on other user pages (Overview and Submitted)
// TODO check compatibility with new reddit
// TODO implement dictionary instead of random characters to defeat overwrite detection 
// TODO add buttons to exclude individual comments
// TODO add color coding to comments selected for deletion (or to exclude buttons)

// reddit username
unsafeWindow.user = '';
// array of comments (more precisely author tags)
unsafeWindow.comments = [];
// top section contents
unsafeWindow.div = null;
//status text
unsafeWindow.status_message = null;

// subreddit selected for deletion
unsafeWindow.subreddit = "ALL";
unsafeWindow.subreddit_array = [];


// on page loaded, initialize the script
window.addEventListener("DOMContentLoaded", init_script, false);

function init_script(ev) {
    //if activated, set default settings for the extra options above
    if (set_default_settings) setDefaults();
    if (safeMode) setSafeModeDefaults();

    // get logged in username
    unsafeWindow.user = document.querySelector("span.user > a:not(.login-required)").innerHTML;

    // if not logged in exit
    if (!unsafeWindow.user) return;

    // retrieve all VISIBLE comments
    get_comments();

    // automatically start deletion process instead of generating buttons, if active
    if (auto_delete) {
        unsafeWindow.start_processing_comments(true, true);
    }
    else {
        // generate the top buttons
        generate_top_buttons();
    }
}

function get_comments() {
    // find all author tags to eventually get comments
    let comments = document.querySelectorAll("a.author");

    // filter out other authors
    unsafeWindow.comments = [].filter.call(comments, filter_author);

    // remove duplicates to fix double processing of comments to own posts
    unsafeWindow.comments = filter_duplicates(unsafeWindow.comments);

    // if active, filter out comments from the past 24 hours
    if (only_delete_old_comments) {
        unsafeWindow.comments = [].filter.call(unsafeWindow.comments, filter_time);
    }

    // if active, filter out comments from other subreddits than the chosen one
    if (only_delete_by_subreddit && unsafeWindow.subreddit !== "ALL") {
        unsafeWindow.comments = [].filter.call(unsafeWindow.comments, filter_subreddit);
    }

    // if active, filter out non downvoted comments
    if (only_delete_downvoted) {
        unsafeWindow.comments = [].filter.call(unsafeWindow.comments, filter_downvotes);
    }

    // if active, filter out upvoted comments
    if (ignore_upvoted) {
        unsafeWindow.comments = [].filter.call(unsafeWindow.comments, filter_upvotes);
    }

    update_status_text();
    if(highlight_comments) update_highlighting();
}

// append buttons to page
function generate_top_buttons() {
    if (unsafeWindow.comments.length) {
        unsafeWindow.div = document.createElement("div");
        unsafeWindow.div.setAttribute('class', 'nextprev secure_delete_all');
        unsafeWindow.div.innerHTML = "";
        unsafeWindow.div.style.marginBottom = "10px";
        unsafeWindow.div.style.display = "flex";
        unsafeWindow.div.style.justifyContent = "flex-start";
        unsafeWindow.div.style.alignItems = "center";

        // make Subreddit Filter
        if (only_delete_by_subreddit) {
            //Create array of subreddits from comments
            unsafeWindow.subreddit_array = get_subreddit_array();

            let selectList = document.createElement("select");
            selectList.id = "subredditSelect";
            selectList.setAttribute('onChange', 'javascript: subreddit_select(this.value)')

            let selectedTitle = document.createElement("option");
            selectedTitle.selected = true;
            selectedTitle.disabled = true;
            selectedTitle.label = "Subreddit";
            selectList.append(selectedTitle);

            //Create and append the options
            for (let i = 0; i < unsafeWindow.subreddit_array.length; i++) {
                let option = document.createElement("option");
                option.value = unsafeWindow.subreddit_array[i];
                option.text = unsafeWindow.subreddit_array[i];
                selectList.appendChild(option);
            }
            unsafeWindow.div.appendChild(selectList);
        }

        // make Status message
        let status_div = document.createElement("div");
        status_div.style.marginLeft = "10px";
        unsafeWindow.status_message = document.createElement("p");
        unsafeWindow.status_message.setAttribute('class', 'status_message');
        unsafeWindow.status_message.innerHTML = "ERROR";
        status_div.appendChild(unsafeWindow.status_message);
        unsafeWindow.div.appendChild(status_div);

        // make Overwrite and Delete All link
        let odlink = document.createElement("a");
        odlink.setAttribute('class', 'bylink');
        odlink.setAttribute('onClick', 'javascript: start_processing_comments(true, true)');
        odlink.setAttribute('href', 'javascript:void(0)');
        odlink.style.marginLeft = "10px";
        odlink.appendChild(document.createTextNode('OVERWRITE AND DELETE'));
        unsafeWindow.div.appendChild(odlink);
        let br = document.createElement("br");
        unsafeWindow.div.appendChild(br);

        if (show_overwrite_button) {
            // make Overwrite All link
            let olink = document.createElement("a");
            olink.setAttribute('class', 'bylink');
            olink.setAttribute('onClick', 'javascript: start_processing_comments(true, false)');
            olink.setAttribute('href', 'javascript:void(0)');
            olink.style.marginLeft = "10px";
            olink.appendChild(document.createTextNode('OVERWRITE'));
            unsafeWindow.div.appendChild(olink);
            let br2 = document.createElement("br");
            unsafeWindow.div.appendChild(br2);
        }

        if (show_delete_button) {
            // make Delete All link
            let dlink = document.createElement("a");
            dlink.setAttribute('class', 'bylink');
            dlink.setAttribute('onClick', 'javascript: start_processing_comments(false, true)');
            dlink.setAttribute('href', 'javascript:void(0)');
            dlink.style.marginLeft = "10px";
            dlink.appendChild(document.createTextNode('DELETE'));
            unsafeWindow.div.appendChild(dlink);
        }

        //add our div to the webpage
        document.querySelector("div.content")
            .insertBefore(unsafeWindow.div, document.querySelector("div.content").firstChild);

        //update status text now that we have defined unsafeWindow.status_message
        update_status_text();
    } else {
        let div = document.createElement("div");
        div.style.marginLeft = "15px";
        div.innerHTML = "YARCO: No comments found. Please check your active filters and try again.";

        document.querySelector("div.content").insertBefore(div, document.querySelector("div.content").firstChild);
    }

    //add individual comment buttons
    if (generate_individual_delete_buttons) unsafeWindow.generate_delete_buttons();
}

unsafeWindow.start_processing_comments = function (overwrite_all, delete_all) {
    //get comments again in case the user has scrolled and revealed more comments
    get_comments();

    let commentsArray = [];

    for (let i = 0; i < unsafeWindow.comments.length; i++) {
        //for each author, get ID of the input field of the comment
        let thing_id = unsafeWindow.comments[i].parentNode.parentNode.querySelector("form.usertext > input[name='thing_id']").value;

        //TODO remove this
        if (!thing_id) {
            console.log("ERROR! Thing ID undefined for", unsafeWindow.comments[i]);
            continue;
        }

        if (commentsArray.indexOf(thing_id) == -1) {
            commentsArray.push(thing_id);
        }
    }

    if (overwrite_all && delete_all) {
        unsafeWindow.overwrite_all(commentsArray, true);
    } else if (overwrite_all) {
        unsafeWindow.overwrite_all(commentsArray, false);
    } else if (delete_all) {
        unsafeWindow.delete_all(commentsArray);
    }

    //set status message while working
    if (unsafeWindow.status_message) {
        unsafeWindow.status_message.innerHTML = `Processing... ${unsafeWindow.comments.length} comments left.`;
    }
}

unsafeWindow.overwrite_all = function (comments, also_delete) {
    //get next comment id
    let thing_id = comments.shift();

    //overwrite the next comment in the stack
    unsafeWindow.overwrite_comment(thing_id);

    //if also deleting, add a timeout and delete the comment
    if (also_delete) unsafeWindow.setTimeout(unsafeWindow.delete_comment(thing_id), time_between_actions);

    //if there are still comments left, get next comment
    //increase timeout if also deleting 
    if (comments.length) {
        unsafeWindow.setTimeout(unsafeWindow.overwrite_all, also_delete ? time_between_actions * 2 : time_between_actions, comments, also_delete);
    } else if (reload_on_completion) {
        if (unsafeWindow.status_message) unsafeWindow.status_message.innerHTML = "Reloading page...";

        unsafeWindow.setTimeout(reload_page, time_between_actions * 5);
    } else get_comments();
}

unsafeWindow.delete_all = function (comments) {
    unsafeWindow.delete_comment(comments.shift());

    //if there are still comments left, get next comment 
    if (comments.length) unsafeWindow.setTimeout(unsafeWindow.delete_all, time_between_actions, comments);
    else if (reload_on_completion) {
        if (unsafeWindow.status_message) unsafeWindow.status_message.innerHTML = "Reloading page...";

        unsafeWindow.setTimeout(reload_page, time_between_actions * 5);
    }
    else get_comments();
}

unsafeWindow.overwrite_comment = function (thing_id) {
    if (safeMode) {
        console.log(`Safe mode active! Accessing overwrite function for ${thing_id}.`);
        //add your debug code here
        return;
    }

    try {
        //find edit form (hidden on page but active)
        let edit_form = document.querySelector(`input[name="thing_id"][value="${thing_id}"]`).parentNode;

        //if comment is currently being edited, cancel out of that 
        let edit_cancel_btn = edit_form.querySelector("div.usertext-edit > div.bottom-area > div.usertext-buttons > button.cancel");
        edit_cancel_btn.click();

        //find edit button and click it
        let edit_btn = edit_form.parentNode.querySelector("ul > li > a.edit-usertext");
        if (edit_btn) edit_btn.click();

        //find edit textbox and replace the string with random chars
        let edit_textbox = edit_form.querySelector("div.usertext-edit > div > textarea");
        let repl_str = '';
        let chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz><.-,+!#$%^&*();:[]~";
        for (let i = 0; i < edit_textbox.value.length; i++) {
            if (edit_textbox.value.substr(i, 1) == '\n') {
                repl_str += '\n';
            } else {
                let random_char = Math.floor(Math.random() * chars.length);
                repl_str += chars.charAt(random_char, 1);
            }
        }

        //set edited value to the random string
        edit_textbox.value = repl_str;

        //find save comment button and click it
        let edit_save_btn = edit_form.querySelector("div.usertext-edit > div.bottom-area > div.usertext-buttons > button.save");
        edit_save_btn.click();
    } catch (e) {
        alert("Error interacting with overwrite form: " + e);
        console.log(e.stack);
    }
}

unsafeWindow.delete_comment = function (thing_id) {
    if (safeMode) {
        console.log(`Safe mode active! Accessing delete function for ${thing_id}.`);
        //add your debug code here
        return;
    }

    try {
        // get current status of comment editing box to prevent deleting comment before overwrite is complete
        let thing = document.querySelector("input[name='thing_id'][value='" + thing_id + "']");
        let status = thing.parentNode.querySelector("div.usertext-edit > div.bottom-area > div.usertext-buttons > span.status").innerHTML;

        //TODO remove this, just testing out where the weird bug is coming from
        if (status === null) throw Error("Status is null");

        if (status.indexOf("error") != -1) {
            alert("Failed to overwrite comment " + thing_id + " due to an unknown reddit error, skipping.");
            return;
        }

        // if status is submitting, there may be an internet connectivity error, so we retry
        if (status.indexOf("submitting") != -1) {
            unsafeWindow.setTimeout(unsafeWindow.delete_comment, time_between_actions * 2.5, thing_id);
            return;
        }

        // find delete button and click it and then yes confirmation button
        let del_form = thing.parentNode.parentNode.querySelector("ul.buttons > li > form.del-button");

        //TODO remove this, just testing out where the weird bug is coming from
        if (del_form === null) throw Error("Del_form is null");

        unsafeWindow.toggle(del_form.querySelector("span.main > a"));
        del_form.querySelector("span.error > a.yes").click();

    } catch (e) {
        alert("Error deleting comment: " + e);
        console.log(e.stack);
    }
}


//[UTILITY FUNCTIONS]
function filter_author(comment) {
    return comment.innerHTML == unsafeWindow.user;
}

function filter_time(comment) {
    let time = comment.parentNode.parentNode.querySelector("time").innerHTML;

    //always exclude comments from the past day
    if (time.indexOf("days") === -1) return false;

    let num_days = time.split(" ");

    return parseInt(num_days[0]) >= old_comments_limit;
}

function filter_subreddit(comment) {
    return comment.parentNode.parentNode.parentNode.querySelector("a.subreddit").innerHTML == unsafeWindow.subreddit;
}

function filter_downvotes(comment) {
    let score = comment.parentNode.parentNode.querySelector("span.score.likes")

    //if we do not have a score (may be hidden) we exclude the comment for this filter
    if (score == null || score.title == null) return false

    return score.title <= downvote_limit;
}

function filter_upvotes(comment) {
    let score = comment.parentNode.parentNode.querySelector("span.score.likes")

    //if we do not have a score (may be hidden) we include the comment for this filter
    if (score == null || score.title == null) return true

    return score.title <= upvote_limit;
}

function filter_duplicates(comments) {
    let array = [];

    // For self-posts, the same author tag will show up twice, once for the post author and
    //then for the comment author. this gets the thing_id for that tag and if there are two
    //consecutive tags it only keeps the second one. Otherwise, the script would process some
    //comments twice, leading to some filters not working properly. 
    for (let i = 0; i < comments.length - 1; i++) {
        let this_comment = comments[i].parentNode.parentNode.querySelector("form.usertext > input[name='thing_id']").value;
        let next_comment = comments[i + 1].parentNode.parentNode.querySelector("form.usertext > input[name='thing_id']").value;

        if (this_comment != next_comment) array.push(comments[i]);
    }

    //since the loop excludes the final item, add it here (will be a comment author)
    array.push(comments[comments.length - 1]);

    return array;
}

function reload_page() {
    //scroll to top first to prevent scrolling to the last deleted comment position after reload
    unsafeWindow.scrollTo(0, 0);

    unsafeWindow.location.reload();
}

function get_subreddit_array() {
    let array = [];

    for (let i = 0; i < unsafeWindow.comments.length; i++) {
        let sub = unsafeWindow.comments[i].parentNode.parentNode.parentNode.querySelector("a.subreddit").innerHTML;

        if (array.indexOf(sub) === -1) array.push(sub);
    }

    // Sort the array case insensitive and add option to disable subreddit filtering 
    array = array.sort(sort_ignore_caps);
    array.unshift("ALL");

    return array;
}

function sort_ignore_caps(a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
}

function update_status_text() {
    if (unsafeWindow.status_message === null) return;

    if (noCommentsFound()) {
        unsafeWindow.status_message = "Problem getting comments!";
        console.log("No comments found!", unsafeWindow.comments)
    }

    let message = "FOUND " + unsafeWindow.comments.length + " COMMENT";
    if (unsafeWindow.comments.length > 1) message += "S";

    if ((only_delete_by_subreddit && unsafeWindow.subreddit !== "ALL") ||
        only_delete_downvoted ||
        ignore_upvoted ||
        only_delete_old_comments) {
        message += "\n(filters active)";
    }

    unsafeWindow.status_message.innerHTML = message;
}

function update_highlighting(){
    unsafeWindow.comments.forEach((value) => {
        let bottomBar = value.parentNode.parentNode.parentNode.querySelector(".child");
        bottomBar.style.height = "5px";
        bottomBar.style.background = "red";
    })
}

function noCommentsFound() {
    return unsafeWindow.comments == null ||
        unsafeWindow.comments.length == 0 ||
        unsafeWindow.comments.some(value => value == null);
}

unsafeWindow.overwrite_delete = function (thing_id) {
    unsafeWindow.overwrite_comment(thing_id);
    unsafeWindow.setTimeout(unsafeWindow.delete_comment, time_between_actions, thing_id);
}

//function to regenerate secure delete buttons after only overwriting a comment
unsafeWindow.overwrite_reload = function (thing_id) {
    unsafeWindow.overwrite_comment(thing_id);
    unsafeWindow.setTimeout(unsafeWindow.generate_delete_buttons, 500);
}

unsafeWindow.subreddit_select = function (option) {
    unsafeWindow.subreddit = option;
    get_comments();
}

//[EXTRA FEATURES]
//Add a "SECURE DELETE" button near each comment delete button
unsafeWindow.generate_delete_buttons = function () {
    // first get comments again to bypass any active filters (see get_comments() for explanation)
    let comments = document.querySelectorAll("a.author");
    comments = [].filter.call(comments, filter_author);
    comments = filter_duplicates(comments);

    for (let i = 0; i < comments.length; i++) {
        try {
            // get the parent
            let main_parent = comments[i].parentNode.parentNode;
            let thing_id = main_parent.querySelector("form > input[name='thing_id']").value;
            let list = main_parent.querySelector("ul.flat-list");

            // add SECURE DELETE link to comments
            let secure_delete_link = document.createElement("li");
            secure_delete_link.setAttribute('class', 'secure_delete');

            let dlink = document.createElement("a");
            dlink.setAttribute('class', 'bylink secure_delete');
            dlink.setAttribute('onClick', 'javascript: overwrite_delete("' + thing_id + '")');
            dlink.setAttribute('href', 'javascript:void(0)');
            dlink.appendChild(document.createTextNode('SECURE DELETE'));
            secure_delete_link.appendChild(dlink);

            list.appendChild(secure_delete_link);

            // add OVERWRITE link to comments
            let overwrite_link = document.createElement("li");
            overwrite_link.setAttribute('class', 'overwrite');

            let olink = document.createElement("a");
            olink.setAttribute('class', 'bylink secure_delete');
            olink.setAttribute('onClick', 'javascript: overwrite_reload("' + thing_id + '")');
            olink.setAttribute('href', 'javascript:void(0)');
            olink.appendChild(document.createTextNode('OVERWRITE'));
            overwrite_link.appendChild(olink);

            list.appendChild(overwrite_link);
        } catch (e) {
            alert("Error adding Secure Delete links to comments.\nError: " + e);
            console.log(e.stack);
        }
    }
}

//sets the defaults I like (tired of copy pasting for every update)
function setDefaults() {
    generate_individual_delete_buttons = true;
    only_delete_old_comments = true;
    ignore_upvoted = true;
    upvote_limit = 10;
    reload_on_completion = true;
    highlight_comments = true;
}

//if we are in safe mode we're not interacting with reddit so we eliminate the delays
function setSafeModeDefaults() {
    time_between_actions = 0;
    reload_on_completion = false;
}
