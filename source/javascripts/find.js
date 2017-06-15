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
        });
}

async function findGas() {
    let path = dirRenderer.getDirections().routes[0].overview_path;
    bounds = rb.box(path, search_dist_from_route);
    let places = await searchBounds(bounds);
    let placeDetails = await getPlaceDetails(places);
    console.log(placeDetails)
}


/*
* Source: https://www.cookieshq.co.uk/posts/search-places-along-a-route-with-google-maps-and-routboxer
* The search function is wrap around a for loop with a setTimeout so that the request are throttled to an 
* avg of 10 a second that is the max request you can make on google
*/

async function searchBounds(bnds, keyword = '', type = 'gas_station') {
    let promises = [];

    //perform searches inside the passed-in bounds to find places near the route
    for (let i = 0; i < bnds.length; i++) {
        let bound = bnds[i];
        // Perform search on the bound and save the result
        // https://developers.google.com/maps/documentation/javascript/places#radar_search_requests
        let search = new Promise((resolve, reject) => {
            setTimeout(() => {        //timeout to ensure not too many at once (rate limited)
                placeService.radarSearch({
                    bounds: bound,
                    type: type,
                    keyword: keyword
                }, (results, status) => { //callback for search result
                    if (status === google.maps.places.PlacesServiceStatus.OK) {
                        resolve(results);
                    } else {
                        reject(status);
                    }
                });
            }, 400 * i);
        });

        promises.push(search)
    }

    //wait for all the searches to finish
    return Promise.all(promises)
        .then(searches_result => {
            //remove duplicate places. This can occur if bounds overlap
            let nearby_places = new Set();
            for (let search_results of searches_result) {
                for (let result of search_results) {
                    nearby_places.add(result.place_id);
                }
            }

            return nearby_places;
        });
}

async function getPlaceDetails(places) {
    let details = [];

    for (let place_id of places) {
        //check if place has already been cached locally
        if (localStorage[place_id]) {
            let placeDetails = JSON.parse(localStorage[place_id]);
            details.push(placeDetails);
        }
        //place is not cached, request details from google
        else {
            let placeDetails = new Promise((resolve, reject) => {
                placeService.getDetails({ // https://developers.google.com/maps/documentation/javascript/places#place_details_requests
                    placeId: place_id
                }, (place, status) => {
                    //cache the place and resolve the promise
                    if (status == google.maps.places.PlacesServiceStatus.OK) {
                        localStorage[place_id] = JSON.stringify(place);
                        resolve(place);
                    } else {
                        reject(status);
                    }
                });
            });
            details.push(placeDetails);
        }
    }

    return Promise.all(details);
}