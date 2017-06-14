var map;
var ac_start, ac_end;
var placeService;
var dirService, dirRenderer;
var rb, search_dist_from_route = .5;


document.addEventListener("DOMContentLoaded", initialize);


async function initialize() {
    rb = new RouteBoxer();

    //init autocomplete
    let start = document.getElementById('start');
    ac_start = new google.maps.places.Autocomplete(start);
    let end = document.getElementById('end');
    ac_end = new google.maps.places.Autocomplete(end);

    //init map with options
    var pos = await getLocation();
    var zoom = 16;
    if (pos) {
        pos.coords['lat'] = pos.coords['latitude'];
        pos.coords['lng'] = pos.coords['longitude'];
    } else {
        pos = {
            'coords': {
                'lat': 0,
                'lng': 0
            }
        };
        zoom = 3;
    }
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: zoom,
        center: pos.coords
    });

    //init places
    placeService = new google.maps.places.PlacesService(map);

    //init directions
    dirService = new google.maps.DirectionsService();
    dirRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        map: map,
        panel: document.getElementById('renderer-panel')
    });

    //add google event listeners
    google.maps.event.addDomListener(window, "resize", resizeMap);
    google.maps.event.addListener(ac_start, 'place_changed', modStartPos);
    google.maps.event.addListener(ac_end, 'place_changed', modDestPos);
}

async function getLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            //query for pos and input use it to initMap when found
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    //update the 'start' text box
                    document.getElementById('start').value = pos.coords['latitude'] + ", " + pos.coords['longitude'];

                    resolve(pos)
                },
                null,
                {
                    enableHighAccuracy: true,
                    timeout: 4000,
                    maximumAge: 0
                });
        } else {
            resolve(null);
        }
    });
}

function resizeMap() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
}

function getStart() {
    return ac_start.getPlace();
}
function getDest() {
    return ac_end.getPlace();
}

function modStartPos() {
    let pos = getStart().geometry.location;
    if (pos) {
        map.setCenter(pos);

        //change map bounds
        map.fitBounds(getStart().geometry.viewport);
    }
}
function modDestPos() {
    console.log(getDest());
}

function getDirs() {
    dirService.route(
        {
            origin: getStart().geometry.location,
            destination: getDest().geometry.location,
            travelMode: 'DRIVING',
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            // provideRouteAlternatives: true,
            avoidTolls: true
        },
        function (result, status) {
            if (status == google.maps.DirectionsStatus.OK) {
                dirRenderer.setDirections(result);
            } else if (status == google.maps.DirectionsStatus.ZERO_RESULTS) {
                alert("no results");
            }
            console.log(result, status);
        });
}

async function findGas() {
    let path = dirRenderer.getDirections().routes[0].overview_path;
    bounds = rb.box(path, search_dist_from_route);
    console.log(await searchBounds(bounds));
}


/*
* Source: https://www.cookieshq.co.uk/posts/search-places-along-a-route-with-google-maps-and-routboxer
* The search function is wrap around a for loop with a setTimeout so that the request are throttled to an 
* avg of 10 a second that is the max request you can make on google
*/

async function searchBounds(bnds) {
    let promises = [];

    //perform searches inside the passed-in bounds to find places near the route
    for (let i = 0; i < bnds.length; i++) {
        //timeout to ensure not too many at once
        setTimeout(() => {
            // Perform search on the bound and save the result
            // https://developers.google.com/maps/documentation/javascript/places#radar_search_requests
            let search = new Promise((resolve, reject) => {
                placeService.radarSearch({
                    bounds: bnds[i],
                    type: 'gas_station'
                }, (results, status) => { //callback for search result
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(results);
                    } else {
                        reject(status);
                    }
                });
            });

            promises.push(search)
        }, 400 * i);
    }

    //wait for all the searches to finish
    console.log("timeout ended", promises)
    return Promise.all(promises).then(function(val){
        console.log(val)
    }
    //     searches_result => {
    //     console.log(searches_result)
    //     let unique_places = {};
    //     for (let search_results in searches_result) {
    //         //remove duplicate places
    //         for (let result in search_results) {
    //             console.log(result);
    //             if (!(result.place_id in establishments)) {
    //                 unique_places[result.place_id] = "";
    //             }
    //         }
    //     }
    //     return searches_result;
    // }
    );
}