$(function () {
    //chrome.storage.local.clear();
    chrome.storage.local.get('options', function (result) {
        var opts = result.options || options;

        $('#initial-tab').val(opts.tab);

        $('#eye-project-info input').prop('checked', opts.eye.project);

        $('#eye-search-gmail input').prop('checked', opts.gmail.eye);
        $('#gmail-results-count').val(opts.gmail.count);
        $('#gmail-search-prefix').val(opts.gmail.prefix);
        $('#default-search-gmail input').prop('checked', opts.gmail.issue);
        $('#selection-search-gmail input').prop('checked', opts.gmail.selection);

        $('#jira-initial-tab').val(opts.jira.tab);
        $('#eye-search-jira input').prop('checked', opts.jira.eye);
        $('#jira-results-count').val(opts.jira.count);
        $('#default-search-jira input').prop('checked', opts.jira.issue);
        $('#selection-search-jira input').prop('checked', opts.jira.selection);

        $('#eye-search-stackoverflow input').prop('checked', opts.stackoverflow.eye);
        $('#stackoverflow-results-count').val(opts.stackoverflow.count);
        $('#selection-search-stackoverflow input').prop('checked', opts.stackoverflow.selection);

        $('#eye-search-google input').prop('checked', opts.google.eye);
        $('#selection-search-google input').prop('checked', opts.google.selection);

        $('#save-prefs').click(function (e) {
            var options = {
                tab: $('#initial-tab').val(),
                eye: {
                    project: $('#eye-project-info input').is(":checked")
                },
                gmail: {
                    eye: $('#eye-search-gmail input').is(":checked"),
                    count: parseInt($('#gmail-results-count').val(), 10),
                    prefix: $('#gmail-search-prefix').val(),
                    issue: $('#default-search-gmail input').is(":checked"),
                    selection: $('#selection-search-gmail input').is(":checked")
                },
                jira: {
                    eye: $('#eye-search-jira input').is(":checked"),
                    count: parseInt($('#jira-results-count').val(), 10),
                    tab: $('#jira-initial-tab').val(),
                    issue: $('#default-search-jira input').is(":checked"),
                    selection: $('#selection-search-jira input').is(":checked")
                },
                stackoverflow: {
                    eye: $('#eye-search-stackoverflow input').is(":checked"),
                    count: parseInt($('#stackoverflow-results-count').val(), 10),
                    selection: $('#selection-search-stackoverflow input').is(":checked")
                },
                google: {
                    eye: $('#eye-search-google input').is(":checked"),
                    selection: $('#selection-search-google input').is(":checked")
                }
            };

            chrome.storage.local.set({
                options: options
            }, function () {
                $('.messages .alert-info').show();
            });
        });
    });
});