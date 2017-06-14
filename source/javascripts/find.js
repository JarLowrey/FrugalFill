var map;
var ac_start, ac_end;

async function initialize() {
    //init autocomplete
    let start = document.getElementById('start');
    let end = document.getElementById('end');
    ac_start = new google.maps.places.Autocomplete(end);
    ac_end = new google.maps.places.Autocomplete(start);
    google.maps.event.addListener(ac_start, 'place_changed', modStartPos);
    google.maps.event.addListener(ac_end, 'place_changed', modEndPos);

    //get start pos
    var pos = await getLocation();
    pos.coords['lat'] = pos.coords['latitude'];
    pos.coords['lng'] = pos.coords['longitude'];

    //init map
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: pos.coords
    });

    //add google event listeners
    google.maps.event.addDomListener(window, "resize", resizeMap);
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
                promptForCoords,
                {
                    enableHighAccuracy: true,
                    timeout: 4000,
                    maximumAge: 0
                });
        } else {
            resolve(promptForCoords());
        }
    });
}

async function promptForCoords() {
    return new Promise((resolve, reject) => {
        let address = "";
        let pos = null;

        resolve(pos);
    });
}

function resizeMap() {
    var center = map.getCenter();
    google.maps.event.trigger(map, "resize");
    map.setCenter(center);
}

function modStartPos(){
    console.log(ac_start.getPlace());
}
function modEndPos(){
    console.log(ac_end.getPlace());   
}