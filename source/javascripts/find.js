var map;
var ac_start, ac_end;
var dirService, dirRenderer;

async function initialize() {
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
            }else if (status == google.maps.DirectionsStatus.ZERO_RESULTS){
                alert("no results");
            }
            console.log(result,status);
        });
}
