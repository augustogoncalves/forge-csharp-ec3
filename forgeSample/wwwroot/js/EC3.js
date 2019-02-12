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

function arrayContains(array, name) {
    for (var i = 0; i < array.length; i++)
        if (array[i].name === name)
            return i;
    return -1;
}

function ec3export() {
    if (typeof (NOP_VIEWER) === "undefined") {
        alert('Please select BIM 360 file');
        return;
    }

    var node = $('#userHubs').jstree(true).get_selected(true)[0];
    var version = $('#userHubs').jstree(true).get_node(node.parents[0]);

    jQuery.ajax({
        url: '/api/ec3/oauth/token',
        fail: function (res) {
            $('#ec3signin').modal('toggle');
        },
        success: function () {
            $.ajax({
                url: '/api/ec3/projects',
                method: 'GET',
                success: function (res) {
                    var data = JSON.parse(res);
                    var found = false;
                    data.forEach(function (project) {
                        if (project.bim_urn === version.id && !found) {
                            ec3loaddata(project.id);
                            found = true;
                        }
                    });
                    if (found) alert('This project was already exported.');
                    else ec3submit();
                }
            });
        }
    });
}
function ec3submit() {

    var viewer = NOP_VIEWER;
    var ec3BIMModels = [];
    viewer.getObjectTree(function (objectTree) {
        getAllLeafComponents(viewer, function (dbIds) {
            var isDone = 0;
            dbIds.forEach(function (dbId) {
                viewer.getProperties(dbId, function (ele) {
                    // first let's check if the instance has Volume...
                    var instanceVolumeProperty = getPropByName(ele.properties, "Volume");
                    if (instanceVolumeProperty !== undefined) {

                        // now get the instance name and check if is valid
                        var instanceName = ele.name; //objectTree.getNodeName(ele.dbId)
                        //if (instanceName === undefined || instanceName === '') return;

                        // get the instance Category (BIM Model)
                        var categoryProperty = getPropByName(ele.properties, "Category");
                        categoryProperty.displayValue = categoryProperty.displayValue.replace('Revit ', '');
                        var ec3BIMModelIndex = arrayContains(ec3BIMModels, categoryProperty.displayValue);
                        if (ec3BIMModelIndex === -1)
                            ec3BIMModelIndex = ec3BIMModels.push({ name: categoryProperty.displayValue, types: [] }) - 1;

                        // now get the instance Type (BIM Type)
                        var familyType = objectTree.getNodeName(objectTree.getNodeParentId(ele.dbId))
                        var ec3BIMTypesIndex = arrayContains(ec3BIMModels[ec3BIMModelIndex].types, familyType);
                        if (ec3BIMTypesIndex === -1)
                            ec3BIMTypesIndex = ec3BIMModels[ec3BIMModelIndex].types.push({ name: familyType, instances: [] }) - 1;

                        // get the instance material and prepare the instance data
                        var instanceMaterialProperty = getPropByName(ele.properties, "Structural Material");
                        var quantity = instanceVolumeProperty.displayValue + ' ' + instanceVolumeProperty.units;
                        var instance =
                        {
                            name: instanceName,
                            external_id: ele.dbId, // this should be externalId, but dbId for simplicity
                            quantity: quantity,
                            materials: [
                                {
                                    name: instanceMaterialProperty.displayValue,
                                    quantity: instanceVolumeProperty.displayValue
                                }]
                        }
                        if (ec3BIMModels[ec3BIMModelIndex].types[ec3BIMTypesIndex].instances.length < 10)
                            ec3BIMModels[ec3BIMModelIndex].types[ec3BIMTypesIndex].instances.push(instance);
                    }

                    isDone++;
                    if (isDone == dbIds.length) {
                        $('#ec3submit').html('Sending...');

                        var node = $('#userHubs').jstree(true).get_selected(true)[0];
                        var item = $('#userHubs').jstree(true).get_node(node.parents[1]);
                        var version = $('#userHubs').jstree(true).get_node(node.parents[0]);

                        var projectName = item.text.replace('.rvt', '') + ' ' + (new Date()).getTime().toString(),
                            projectName = prompt('Confirm name for Building Transparency: ', projectName);

                        var ec3BIMProject = {
                            name: projectName,
                            bim_urn: version.id,
                            models: ec3BIMModels
                        }

                        console.log(ec3BIMProject);
                        //console.log(JSON.stringify(ec3BIMProject));

                        if (projectName == null) return;

                        $.ajax({
                            url: '/api/ec3/projects',
                            method: 'POST',
                            data: JSON.stringify(ec3BIMProject),
                            contentType: "application/json",
                            dataType: 'json',
                            complete: function (res) {
                                $('#ec3submit').html('Send to project');
                                alert('Done');
                            }
                        });
                    }
                });
            })
        });
    });
}

function ec3import() {
    var node = $('#userHubs').jstree(true).get_selected(true)[0];
    var version = $('#userHubs').jstree(true).get_node(node.parents[0]);

    jQuery.ajax({
        url: '/api/ec3/oauth/token',
        fail: function (res) {
            $('#ec3signin').modal('toggle');
        },
        success: function () {
            $.ajax({
                url: '/api/ec3/projects',
                method: 'GET',
                success: function (res) {
                    var data = JSON.parse(res);
                    var found = false;
                    data.forEach(function (project) {
                        if (project.bim_urn === version.id && !found) {
                            ec3loaddata(project.id);
                            found = true;
                        }
                    });
                    if (!found) {
                        alert('Could not find matching project');
                    }
                }
            });
        }
    });
}

function ec3loaddata(ec3projectid) {
    $.ajax({
        url: '/api/ec3/projects/' + ec3projectid,
        method: 'GET',
        success: function (data) {
            ec3showresults(data);
        }
    });
}

function ec3showresults(data) {
    if (typeof (NOP_VIEWER) === "undefined") {
        alert('Please select BIM 360 file');
        return;
    }
    var viewer = NOP_VIEWER;

    var values = {};
    var max = Number.MIN_SAFE_INTEGER;
    var min = Number.MAX_SAFE_INTEGER;

    data.models.forEach(function (model) {
        model.types.forEach(function (types) {
            types.instances.forEach(function (instance) {
                if (instance.ec3_embodied_carbon == null) return;
                var gwpc = instance.ec3_embodied_carbon.gwp_conservative;
                var gwpa = instance.ec3_embodied_carbon.gwp_achievable;
                var potential = gwpc - gwpa;
                if (potential > max) max = potential;
                if (potential < min) min = potential;
                values[instance.external_id] = potential;
            })
        })
    })

    viewer.clearThemingColors();
    viewer.isolate(-1);
    for (var key in values) {
        var dbId = Number.parseInt(key);
        viewer.show(dbId);
        if (values[key] === 0) viewer.setThemingColor(dbId, new THREE.Vector4(0.75, 0.75, 0.75, 1), viewer.model);
        else {
            var range = (values[key] - min) / (max - min);
            viewer.setThemingColor(dbId, getColor(range));
        }
    }
}

function getColor(ratio) {
    var color1 = '00994C';
    var color2 = '990000';
    var rainbow = new Rainbow();
    rainbow.setNumberRange(1, 10);
    rainbow.setSpectrum(color1, color2);
    var index = Math.round(ratio * 10)
    var color = rainbow.colourAt(index);
    return new THREE.Vector4(
        parseInt(color.substring(0, 2), 16) / 256,
        parseInt(color.substring(2, 4), 16) / 256,
        parseInt(color.substring(4, 6), 16) / 256,
        1);
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