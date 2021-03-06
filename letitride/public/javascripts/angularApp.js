var app = angular.module('letitride', ['ui.router']);


//MAIN CONTROLLER 
app.controller('MainCtrl', ['$scope', '$stateParams', 'auth', function ($scope, $stateParams, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
}]);

//RIDE CONTROLLER
app.controller('RideCtrl', ['$scope', '$stateParams', 'auth', function ($scope, $stateParams, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
    initMap();
}]);

app.controller('DriverCtrl', ['$scope', '$stateParams', 'auth', function ($scope, $stateParams, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
    initMapDriver();
}]);

//AUTHENTICATION CONTROLLER
app.controller('AuthCtrl', [
    '$scope',
    '$state',
    'auth',
    function ($scope, $state, auth) {
        $scope.user = {};

        $scope.register = function () {
            auth.register($scope.user).error(function (error) {
                $scope.error = error;
            }).then(function () {
                $state.go('home');
            });
        };

        $scope.logIn = function () {
            auth.logIn($scope.user).error(function (error) {
                $scope.error = error;
            }).then(function () {
                $state.go('home');
            });
        };
    }
]);

//NAVIGATION CONTROLLER
app.controller('NavCtrl', [
    '$scope',
    'auth',
    function ($scope, auth) {
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logOut = auth.logOut;
    }
]);

//AUTHENTICATION FACTORY
app.factory('auth', ['$http', '$window', function ($http, $window) {
    var auth = {};

    auth.logIn = function (user) {
        return $http.post('/login', user).success(function (data) {
            auth.saveToken(data.token);
        });
    };

    auth.logOut = function () {
        $window.localStorage.removeItem('letitride-token');
    };

    auth.register = function (user) {
        return $http.post('/register', user).success(function (data) {
            auth.saveToken(data.token);
        });
    };

    auth.currentUser = function () {
        if (auth.isLoggedIn()) {
            var token = auth.getToken();
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.username;
        }
    };

    auth.isLoggedIn = function () {
        var token = auth.getToken();

        if (token) {
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.exp > Date.now() / 1000;
        } else {
            return false;
        }
    };

    auth.saveToken = function (token) {
        $window.localStorage['letitride-token'] = token;
    };

    auth.getToken = function () {
        return $window.localStorage['letitride-token'];
    }

    return auth;
}]);

//STATES
app.config(['$stateProvider', '$urlRouterProvider',
    function ($stateProvider, $urlRouterProvider) {
        $stateProvider
            .state('home', {
                url: '/home',
                templateUrl: '/home.html',
                controller: 'MainCtrl'
            })
            .state('contact', {
                url: '/contact',
                templateUrl: '/contact.html',
                controller: 'MainCtrl'
            })
            .state('driver', {
                url: '/driver',
                templateUrl: '/driver.html',
                controller: 'DriverCtrl'
            })
            .state('about', {
                url: '/about',
                templateUrl: '/about.html',
                controller: 'MainCtrl'
            })
            .state('ride', {
                url: '/ride',
                templateUrl: '/ride.html',
                controller: 'RideCtrl'
            })
            .state('login', {
                url: '/login',
                templateUrl: '/login.html',
                controller: 'AuthCtrl',
                onEnter: ['$state', 'auth', function ($state, auth) {
                    if (auth.isLoggedIn()) {
                        $state.go('ride');
                    }
                }]
            })
            .state('register', {
                url: '/register',
                templateUrl: '/register.html',
                controller: 'AuthCtrl',
                onEnter: ['$state', 'auth', function ($state, auth) {
                    if (auth.isLoggedIn()) {
                        $state.go('home');
                    }
                }]
            });
        $urlRouterProvider.otherwise('home');
    }
]);

var searchDistance;
var searchTime;
var driverTime;
var totalCost = 0;
var pos;
var user_positiion;
var destinationPosition = null;

var icon = "http://images.rammount.com/images/icons/activity/driving-min.png";
var driver1 = {
    position: {
        lat: 37.329766,
        lng: -121.881487
    },
    map: map,
    icon: icon
};

function initMap() {
    var directionsDisplay = new google.maps.DirectionsRenderer;
    var directionsService = new google.maps.DirectionsService;

    var map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 36.778259,
            lng: -119.417931
        }, //CA coordinates
        zoom: 15
    });

    var arrayOfMarkers = null;

    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('top-panel'));

    var control = document.getElementById('floating-panel');
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(control);

    var test = new google.maps.Marker(driver1);


    //Users current location
    var infoWindow = new google.maps.InfoWindow({
        map: map
    });
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            infoWindow.setPosition(pos);
            infoWindow.setContent('You are here.');
            map.setCenter(pos);
            user_positiion = pos;

            //arrayOfMarkers = setRandomMarkers(map);

        }, function () {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }

    //add traffic to map
    /*var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map); */

    //event added to button to get directions to a fixed place
    var directionsButtonClick = function () {
        calculateAndDisplayRoute2(directionsService, directionsDisplay, pos);
    };

    var requestRide = function () {
        //var closestDriver = findClosestDriver(arrayOfMarkers, pos.lat, pos.lng);

        //Temporary obj for the calculateAndDisplayRoute function. Dont worry about it
        var obj = {
            lat: driver1.position.lat,
            lng: driver1.position.lng
        }

        calculateAndDisplayRoute(directionsService, directionsDisplay, pos, obj);
    }

    //document.getElementById('click').addEventListener('click', requestRide);
    document.getElementById('searchButton').addEventListener('click', directionsButtonClick);

    var pay = document.getElementById('pay');
    document.getElementById('searchButton').onclick = function () {
        pay.style.visibility = "visible";
    }


    //When an address is found, the address's information (longitude, latitude) will be set to this variable.
    var destinationPosition = null;

    function calculateAndDisplayRoute(directionsService, directionsDisplay, userPos, driverPos) {
        directionsService.route({
            origin: driverPos,
            destination: userPos,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(Date.now()),
                trafficModel: 'pessimistic'
            }
        }, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsDisplay.setDirections(response);
                driverTime = response.routes[0].legs[0].duration.value / 60;
                driverTime.toFixed(2);

            } else {
                window.alert('Directions request failed due to ' + status);
            }
        });

    }

    //function for search address
    function calculateAndDisplayRoute2(directionsService, directionsDisplay, pos) {
        directionsService.route({
            origin: pos,
            destination: destinationPosition,
            travelMode: google.maps.TravelMode.DRIVING,
            drivingOptions: {
                departureTime: new Date(Date.now()),
                trafficModel: 'pessimistic'
            }
        }, function (response, status) {
            if (status === google.maps.DirectionsStatus.OK) {
                directionsDisplay.setDirections(response);
                searchDistance = response.routes[0].legs[0].distance.value;
                searchTime = Math.round(response.routes[0].legs[0].duration.value / 60);

                totalCost = calculateCost(searchDistance, searchTime);
                document.getElementById('cost-info').innerHTML = "";
                document.getElementById('cost-info').innerHTML += 'Estimated Cost of Ride: ' + '$' + totalCost.toFixed(2);
                //document.getElementById('cost-info').innerHTML += '$' + totalCost.toFixed(2);

            } else {
                window.alert('Directions request failed due to ' + status);
            }
        });
    }




    //Search Function stuff. Not sure how to update the pos so that when you search a location and get directions, it changes
    var searchBox = new google.maps.places.SearchBox(document.getElementById('pac-input'));
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(document.getElementById('pac-input'));
    google.maps.event.addListener(searchBox, 'places_changed', function () {
        searchBox.set('map', null);

        var places = searchBox.getPlaces();

        var bounds = new google.maps.LatLngBounds();

        var i, place;
        for (i = 0; place = places[i]; i++) {
            (function (place) {
                var marker = new google.maps.Marker({

                    position: place.geometry.location
                });

                marker.bindTo('map', searchBox, 'map');
                google.maps.event.addListener(marker, 'map_changed', function () {
                    if (!this.getMap()) {
                        this.unbindAll();
                    }
                });
                bounds.extend(place.geometry.location);

                destinationPosition = place.geometry.location;

            }(place));

        }
        map.fitBounds(bounds);
        searchBox.set('map', map);
        map.setZoom(Math.min(map.getZoom(), 12));

    });
}

var socket = io();
socket.on('requestRide', function (msg) {
    socket.emit('destination', destinationPosition);
});


function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

function setRandomMarkers(map) {
    var icon = "http://images.rammount.com/images/icons/activity/driving-min.png";

    var arr = [];

    for (var i = 0; i < 5; i++) {
        var lat1 = getRandomInRange(37.31000, 37.34000, 10);
        var lng1 = getRandomInRange(-121.87000, -121.89000, 10);
        //console.log("Marker[" + i + "]{lat: " + lat1 + ", lng: " + lng1 + "}");
        var randomMarker = new google.maps.Marker({
            position: {
                lat: lat1,
                lng: lng1
            },
            map: map,
            icon: icon
        });

        //Use this to put in array.
        var marker = {
            lat: lat1,
            lng: lng1,
        }

        arr.push(marker);
    }

    return arr;
}

function findClosestDriver(driverList, userLat, userLng) {

    var time = null;

    for (var i = 0; i < 5; i++) {

        var lat = driverList[i].lat;
        var lng = driverList[i].lng;

        function getTime() {
            var res = httpGet("https://crossorigin.me/https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=" + lat + "," + lng + "&destinations=" + userLat + "%2C" + userLng + "&key=AIzaSyCRsRxSy0tifmCIR3QhMRIKFDpydVZEO2k");
            time = res.rows[0].elements[0].duration.value;
        }
        setTimeout(getTime(), 1000);

        driverList[i].time = time;
    }

    var closestDriver = driverList[0];

    driverList.forEach(function (driver) {
        if (driver.time < closestDriver.time) {
            closestDriver = driver;
        }
    })
    return closestDriver;
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(JSON.parse(xmlHttp.responseText));
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

function httpGet(theUrl) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", theUrl, false); // false for synchronous request
    xmlHttp.send(null);
    return JSON.parse(xmlHttp.responseText);
}

function getRandomInRange(from, to, fixed) {
    return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
    // .toFixed() returns string, so ' * 1' is a trick to convert to number
}

var total_pay;

function callDriver() {
    var cd = confirm('Call Driver?');
    if (cd) {
        if (totalCost == 0) {
            alert("Select destination first!");
        } else {
            var pay = confirm("Ride will cost $" + totalCost.toFixed(2) + " dollars. Confirm payment?");
            total_pay = pay;
            if (pay) {
                alert("Ride will take about " + searchTime + " minutes.");
            } else {
                //do nothing
            }
        }

    } else {
        //do nothing
    }
}

function calculateCost(distanceTraveled, time) {
    var a = distanceTraveled * .00125;
    var b = time * .0325;
    var c = a + b;
    return c;
}


function initMapDriver() {
    var map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 36.778259,
            lng: -119.417931
        }, //CA coordinates
        zoom: 15
    });
    var icon = "http://images.rammount.com/images/icons/activity/driving-min.png";
    var driver1 = {
        position: {
            lat: 37.329766,
            lng: -121.881487
        },
        map: map,
        icon: icon
    };

    var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    var pos;
    var infoWindow = new google.maps.InfoWindow({
        map: map
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            pos = {
                lat: driver1.position.lat,
                lng: driver1.position.lng
            };

            var Marker = new google.maps.Marker({
                position: pos,
                map: map,
                icon: icon
            });
            //infoWindow.setPosition(pos);
            //infoWindow.setContent('You are here.');

            map.setCenter(pos);

        }, function () {
            handleLocationError(true, infoWindow, map.getCenter());
        });
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

var socket = io.connect('http://localhost:3000');