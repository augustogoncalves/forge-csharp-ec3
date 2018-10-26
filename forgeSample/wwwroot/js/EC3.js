$(document).ready(function () {
    $('#ec3data').hide();
    jQuery.ajax({
        url: '/api/ec3/oauth/token',
        success: function (res) {
            showEC3(res.Key);
        }
    });

    $('#ec3SigninButton').click(function () {
        jQuery.ajax({
            url: '/api/ec3/oauth/signin',
            method: 'POST',
            data: { username: $('#username').val(), password: $('#password').val() },
            success: function (res) {
                showEC3(res.Key);
            }
        });
    })

    $('#ec3submit').click(ec3submit);
});

function showEC3(token) {
    $('#ec3signin').hide();
    $('#ec3data').show();

    $.ajax({
        url: '/api/ec3/projects',
        method: 'GET',
        success: function (res) {
            var data = JSON.parse(res);
            data.forEach(function (project) {
                $('#ec3projects').append($('<option/>', {
                    value: project.id,
                    text: project.name
                }));
            });
        }
    });
}

var data = [];

function getPropByName(props, name) {
    for (var i = 0; i < props.length; i++)
        if (props[i].displayName === name)
            return props[i];
}

function dataContains(assembly) {
    for (var i = 0; i < data.length; i++)
        if (data[i].name === assembly)
            return i;
    return -1;
}

function ec3submit() {
    if (typeof (NOP_VIEWER) === "undefined") {
        alert('Please select BIM 360 file');
        return;
    }
    var viewer = NOP_VIEWER;
    data = [];
    viewer.getObjectTree(function (objectTree) {
        getAllLeafComponents(viewer, function (dbIds) {
            viewer.model.getBulkProperties(dbIds, ['Category', 'Name', 'Structural Material', 'Volume'], function (elements) {
                elements.forEach(function (ele) {
                    var n = objectTree.getNodeName(ele.dbId)
                    if (n === undefined || n === '') return;
                    var c = getPropByName(ele.properties, "Category");
                    c.displayValue = c.displayValue.replace('Revit ', '');
                    var m = getPropByName(ele.properties, "Structural Material");
                    var v = getPropByName(ele.properties, "Volume");
                    var index = dataContains(c.displayValue);
                    if (index >= 0)
                        data[index].subassembly.push({ name: n, elements: [{ name: m.displayValue, volume: v.displayValue, unit: v.units }] });
                    else
                        data.push({ name: c.displayValue, subassembly: [] });
                })

                for (var i = data.length - 1; i >= 0; i--)
                    if (data[i].subassembly.length == 0)
                        data.splice(i, 1);

                $('#ec3submit').html('Sending...');

                $.ajax({
                    url: '/api/ec3/projects/' + $('#ec3projects').val(),
                    method: 'POST',
                    data: JSON.stringify(data),
                    contentType: "application/json",
                    dataType: 'json',
                    complete: function (res) {
                        $('#ec3submit').html('Send to project');
                        alert('Done');
                    }
                });
            });
        });
    });
}

function ec3submitOld() {
    var viewer = NOP_VIEWER;
    data = [];

    function merge(d, s) {
        for (var i = 0, l = d.length; i < l; i++) {
            if (d[i].subassembly == undefined) {
                d.push(s[0]);
                return;
            }
            if (d[i].subassembly.name === s[0].subassembly.name) {
                merge(d[i].subassembly, s[0].subassembly);
                return;
            }
        }
        //d.subassembly.push(s.subassembly);
    }

    function addToParent(tree, dbId, sub) {
        var parent = tree.getNodeParentId(dbId);
        if (parent === tree.getRootId()) {
            for (var i = 0; i < data.length; i++) {
                if (data[i].name === sub.name) {
                    merge(data[i].subassembly, sub.subassembly);
                    return;
                }
            }
            data.push(sub);
            return;
        }

        var upperdata = { name: tree.getNodeName(parent), subassembly: [sub] }
        addToParent(tree, parent, upperdata);
    }
    viewer.getObjectTree(function (objectTree) {
        getAllLeafComponents(viewer, function (dbIds) {
            viewer.model.getBulkProperties(dbIds, ['Structural Material', 'Volume'], function (props) {
                props.forEach(function (element) {
                    if (element.properties.length != 2) return;
                    var v = (element.properties[0].displayName === 'Volume' ? 0 : 1);
                    var m = (element.properties[0].displayName === 'Structural Material' ? 0 : 1);
                    addToParent(objectTree, element.dbId,
                        {
                            name: objectTree.getNodeName(element.dbId),
                            elements: [{ name: element.properties[m].displayValue, volume: element.properties[v].displayValue + ' ' + element.properties[v].units }]
                        });
                })

                $.ajax({
                    url: '/api/ec3/projects/' + $('#ec3projects').val(),
                    method: 'POST',
                    data: JSON.stringify(data),
                    contentType: "application/json",
                    dataType: 'json',
                    success: function (res) {
                    }
                });
            })
        })
    });
}

function getAllLeafComponents(viewer, callback) {
    var cbCount = 0; // count pending callbacks
    var components = []; // store the results
    var tree; // the instance tree

    function getLeafComponentsRec(parent) {
        cbCount++;
        if (tree.getChildCount(parent) != 0) {
            tree.enumNodeChildren(parent, function (children) {
                getLeafComponentsRec(children);
            }, false);
        } else {
            components.push(parent);
        }
        if (--cbCount == 0) callback(components);
    }
    viewer.getObjectTree(function (objectTree) {
        tree = objectTree;
        var allLeafComponents = getLeafComponentsRec(tree.getRootId());
    });
}