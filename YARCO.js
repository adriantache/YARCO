// ==UserScript==
// @name        Yet Another Reddit Comment Overwriter
// @namespace   https://github.com/adriantache/YARCO/
// @description Local script to overwrite all your comments with random ASCII characters and delete them. This works because Reddit doesn't store editing history, so technically this is the only way to obfuscate the contents of the comments. Based on Reddit Overwrite script v.1.4.8.
// @include     https://*.reddit.com/user/*
// @include     http://*.reddit.com/user/*
// @version     0.1
// @run-at      document-start
// ==/UserScript==


//EXTRA OPTIONS
let generate_individual_delete_buttons = true //disabled by default
let time_between_actions = 2000 //reddit API limit is 60 actions per minute so don't exceed that


// TODO separate overwrite and delete
// TODO only delete comments older than a day
// TODO only delete comments from a certain subreddit
// TODO check feedback for Reddit Overwrite for extra features
// TODO consider caching comments array
// TODO test Overview page
// TODO add STOP button
// TODO add optional confirmation dialog
// TODO add status message while processing 


// reddit username
unsafeWindow.user = '';
// array of comments (more precisely author tags)
unsafeWindow.comments = [];
// number of detected user comments
// TODO refactor this out
unsafeWindow.num_user_comments = 0;
// top section contents
unsafeWindow.span = '';

//TODO refactor these out
unsafeWindow.to_delete = [];
unsafeWindow.deleted = 0;


// on page loaded, initialize the script
window.addEventListener("DOMContentLoaded", init_script, false);

function init_script(ev) {
    // get logged in username
    unsafeWindow.user = document.querySelector("span.user > a:not(.login-required)").innerHTML;

    // if not logged in exit
    if (!unsafeWindow.user) return;

    //retrieve all VISIBLE comments
    get_comments()

    // generate the top buttons
    generate_top_buttons();
}

function get_comments() {
    // find all author tags to eventually get comments
    let comments = document.querySelectorAll("a.author");

    // filter out other authors
    unsafeWindow.comments = [].filter.call(comments, filter_author)

    unsafeWindow.num_user_comments = unsafeWindow.comments.length;
}

// append buttons to page
function generate_top_buttons() {
    if (unsafeWindow.num_user_comments) {
        unsafeWindow.span = document.createElement("div");
        unsafeWindow.span.setAttribute('class', 'nextprev secure_delete_all');
        unsafeWindow.span.innerHTML = "";
        unsafeWindow.span.style.marginBottom = "10px";

        // make Overwrite and Delete All link
        let odlink = document.createElement("a");
        odlink.setAttribute('class', 'bylink');
        odlink.setAttribute('onClick', 'javascript: recursive_process(true, true)');
        odlink.setAttribute('href', 'javascript:void(0)');
        odlink.style.marginLeft = "10px";
        odlink.appendChild(document.createTextNode('OVERWRITE AND DELETE ' +
            unsafeWindow.comments.length +
            ' COMMENTS'));
        unsafeWindow.span.appendChild(odlink);
        let br = document.createElement("br");
        unsafeWindow.span.appendChild(br);

        // make Overwrite All link
        let olink = document.createElement("a");
        olink.setAttribute('class', 'bylink');
        olink.setAttribute('onClick', 'javascript: recursive_process(true, false)');
        olink.setAttribute('href', 'javascript:void(0)');
        olink.style.marginLeft = "10px";
        olink.style.position = "relative";
        olink.style.top = "5px";
        olink.appendChild(document.createTextNode('OVERWRITE ' +
            unsafeWindow.comments.length +
            ' COMMENTS'));
        unsafeWindow.span.appendChild(olink);
        let br2 = document.createElement("br");
        unsafeWindow.span.appendChild(br2);

        // make Delete All link
        let dlink = document.createElement("a");
        dlink.setAttribute('class', 'bylink');
        dlink.setAttribute('onClick', 'javascript: recursive_process(false, true)');
        dlink.setAttribute('href', 'javascript:void(0)');
        dlink.style.marginLeft = "10px";
        dlink.style.position = "relative";
        dlink.style.top = "10px";
        dlink.appendChild(document.createTextNode('DELETE ' +
            unsafeWindow.comments.length +
            ' COMMENTS'));
        unsafeWindow.span.appendChild(dlink);

        // TODO test status message
        // let status_message = document.createTextNode("p");
        // status_message.innerHTML = "STATUS";
        // status_message.style.marginLeft = "10px";
        // status_message.style.position = "relative";
        // status_message.style.top = "10px";
        // unsafeWindow.span.appendChild(status_message);

        document.querySelector("div.content").insertBefore(unsafeWindow.span, document.querySelector("div.content").firstChild);

        //add per comment buttons (disabled by default)
        if (generate_individual_delete_buttons) unsafeWindow.generate_delete_buttons()
    } else if (unsafeWindow.span != null) {
        unsafeWindow.span.style.display = 'none';
    }
}

unsafeWindow.recursive_process = function (overwrite_all, delete_all) {
    //get comments again in case the user has scrolled and revealed more comments
    get_comments()

    let commentsArray = [];

    for (let i = 0; i < unsafeWindow.comments.length; i++) {
        //for each author, get ID of the input field of the comment
        let thing_id = unsafeWindow.comments[i].parentNode.parentNode.querySelector("form.usertext > input[name='thing_id']").value;

        if (commentsArray.indexOf(thing_id) == -1) {
            commentsArray.push(thing_id);
            //TODO refactor this out
            unsafeWindow.num_user_comments++;
        }
    }

    if (overwrite_all && delete_all) {
        unsafeWindow.overwrite_all(commentsArray, true);
    } else if (overwrite_all) {
        unsafeWindow.overwrite_all(commentsArray, false);
    } else if (delete_all) {
        unsafeWindow.delete_all(commentsArray);
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
    if (comments.length) unsafeWindow.setTimeout(unsafeWindow.overwrite_all, also_delete ? time_between_actions * 2 : time_between_actions, comments, also_delete);
}

unsafeWindow.delete_all = function (comments) {
    unsafeWindow.delete_comment(comments.shift());

    //if there are still comments left, get next comment 
    if (comments.length) unsafeWindow.setTimeout(unsafeWindow.delete_all, time_between_actions, comments);
}

unsafeWindow.overwrite_comment = function (thing_id) {
    try {
        //find edit form (hidden on page but active)
        let edit_form = document.querySelector("input[name='thing_id'][value='" + thing_id + "']").parentNode;

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
    }
}

unsafeWindow.delete_comment = function (thing_id) {
    try {
        // get current status of comment editing box to prevent deleting comment before overwrite is complete
        let thing = document.querySelector("input[name='thing_id'][value='" + thing_id + "']");
        let status = thing.parentNode.querySelector("div.usertext-edit > div.bottom-area > div.usertext-buttons > span.status").innerHTML;

        if (status.indexOf("error") != -1) {
            alert("Failed to overwrite comment " + thing_id + " due to an unknown reddit error, skipping.");
            return;
        }

        // if status is submitting, there may be an internet connectivity error, so we retry
        if (status.indexOf("submitting") != -1) {
            unsafeWindow.setTimeout(unsafeWindow.delete_comment, time_between_actions * 5, thing_id);
            return;
        }

        // find delete button and click it and then yes confirmation button
        let del_form = thing.parentNode.parentNode.querySelector("ul.buttons > li > form.del-button");
        unsafeWindow.toggle(del_form.querySelector("span.main > a"));
        del_form.querySelector("span.error > a.yes").click();

    } catch (e) {
        alert("Error deleting comment: " + e);
    }
}


//[UTILITY FUNCTIONS]
function filter_author(comment) {
    return comment.innerHTML == unsafeWindow.user
}

unsafeWindow.overwrite_delete = function (thing_id) {
    unsafeWindow.overwrite_comment(thing_id)
    unsafeWindow.setTimeout(unsafeWindow.delete_comment, time_between_actions, thing_id)
}

//function to regenerate secure delete buttons after only overwriting a comment
unsafeWindow.overwrite_reload = function (thing_id) {
    unsafeWindow.overwrite_comment(thing_id)
    unsafeWindow.setTimeout(unsafeWindow.generate_delete_buttons, 500)
}


//[EXTRA FEATURES]
//Add a "SECURE DELETE" button near each comment delete button
unsafeWindow.generate_delete_buttons = function () {
    get_comments()

    for (let i = 0; i < unsafeWindow.comments.length; i++) {
        try {
            // get the parent
            let main_parent = unsafeWindow.comments[i].parentNode.parentNode;
            let thing_id = main_parent.querySelector("form > input[name='thing_id']").value;
            let list = main_parent.querySelector("ul.flat-list");

            // if it already contains the tags, skip
            if (list.querySelector("li.secure_delete") && list.querySelector("li.overwrite")) continue;

            unsafeWindow.num_user_comments++;

            // add SECURE DELETE link to comments
            let secure_delete_link = document.createElement("li");
            secure_delete_link.setAttribute('class', 'secure_delete');

            let dlink = document.createElement("a");
            dlink.setAttribute('class', 'bylink secure_delete');
            dlink.setAttribute('onClick', 'javascript: overwrite_delete("' + thing_id + '")');
            dlink.setAttribute('href', 'javascript:void(0)');
            dlink.appendChild(document.createTextNode('SECURE DELETE'));
            secure_delete_link.appendChild(dlink);

            main_parent.querySelector("ul.flat-list").appendChild(secure_delete_link);

            // add OVERWRITE link to comments
            let overwrite_link = document.createElement("li");
            overwrite_link.setAttribute('class', 'overwrite');

            let olink = document.createElement("a");
            olink.setAttribute('class', 'bylink secure_delete');
            olink.setAttribute('onClick', 'javascript: overwrite_reload("' + thing_id + '")');
            olink.setAttribute('href', 'javascript:void(0)');
            olink.appendChild(document.createTextNode('OVERWRITE'));
            overwrite_link.appendChild(olink);

            main_parent.querySelector("ul.flat-list").appendChild(overwrite_link);

        } catch (e) {
            alert("Error adding Secure Delete links to comments.\nError: " + e + " Stack:" + e.stack);
        }
    }
}
