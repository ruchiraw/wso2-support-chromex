chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.url.match(/(https:\/\/support.wso2.com\/jira\/browse\/)[a-zA-Z]+-[0-9]+/ig)) {
        chrome.pageAction.show(tabId);
    }
});