angular.module('setlister', ['ngCookies']);

var app = angular.module('setlister');
 

app.controller('mainController', function($scope, $cookies, $http, spotify, setlistfm){
    $scope.artistInput = "heaven shall burn";
    $scope.foundSongs = [];
    $scope.readyToAddSongs = true;
    
    function findSongOnSpotify(song) {
        var indexOfSong = $scope.setlist.songs.indexOf(song);
        
        spotify.searchTrack($scope.artist.name + " " + song.name).then(function (spotifySong) {
            song.spotifyData = spotifySong;
            
            if (indexOfSong === ($scope.songs.length - 1))
                return;
            
            findSongOnSpotify($scope.setlist.songs[indexOfSong + 1]);
        });
    }
    
    function findSongsOnSpotify() {
        var song = $scope.setlist.songs[0];
        findSongOnSpotify(song);
    }
   
    spotify.getPlaylists().success(function(playlists){
       $scope.playlists = playlists.items; 
    });
    
    spotify.getProfile().success(function(profile){
       $scope.profile = profile; 
       console.log('fafa');
    });

    $scope.$watchGroup(['playlist', 'songs'], function () {
        //TODO: get playlist songs
    });
    
    $scope.$watch('artistIndex', function(){
        if ($scope.artists)
            $scope.artist = $scope.artists[$scope.artistIndex]; 
    });
    
    $scope.$watch('setlistIndex', function () {
        if ($scope.setlists) {
            $scope.setlist = $scope.setlists[$scope.setlistIndex];
            $scope.songs = $scope.setlist.songs;
            findSongsOnSpotify();
        }
    });
    
   function addSongToSpotifyList(song){
        var indexOfSong = $scope.songs.indexOf(song);
        
        if (!song.spotifyData)
            addSongToSpotifyList($scope.songs[indexOfSong + 1]);

       spotify.addSongToList(song.spotifyData.uri, $scope.selectedList.id, $scope.profile.id).success(function() {
            song.addedToList = true;

            if (indexOfSong === ($scope.songs.length - 1)) {
                $scope.readyToAddSongs = true;
                return;
            }

            addSongToSpotifyList($scope.songs[indexOfSong + 1]);
       });
   }
    
    $scope.addSongsToList = function () {
        $scope.readyToAddSongs = false;
        var song = $scope.songs[0];
        addSongToSpotifyList(song);
    }
    
   $scope.loggedIn = $cookies.get("spotify_access_token") != null;
   $scope.enteredSongs = [];
   
   if ($scope.loggedIn){
       $scope.authKey = $cookies.get("spotify_access_token");
   }
    
   $scope.searchSetlist = function(){
       setlistfm.getSetlist($scope.artist.setlistfmId,0)
        .success(function (setlists) {
            $scope.setlists = setlists;
            $scope.setlistIndex = 0;
            
       });
    }

   $scope.searchArtist = function(){
    setlistfm.getArtists($scope.artistInput).success(function (artists) {
        $scope.artistIndex = 0;
        $scope.artists = artists;
        $scope.artist = artists[0];
        $scope.artistId = $scope.artist.setlistfmId;
            
    });  
    }
    
    function getSetLists() {
        setlistfm.getSetlist($scope.artistId, 0)
        .success(function (setlists) {
            $scope.setlistIndex = 0;
            $scope.setlists = setlists;

                //findSongsOnSpotify();
            }); 
    }
   
   $scope.search = function(){
        if (!$scope.enteredSongsInput){
           return;
       }
       
       $scope.foundSongs.length = 0;
       
      var lines = $scope.enteredSongsInput.split("\n");
      
      $scope.enteredSongs.length = 0;
      
      for(var i=0;i<lines.length;i++){
          $scope.enteredSongs.push(lines[i]);
          
          var song = lines[i];
          addSong(song, $scope.artistInput);
      } 
   }
});

app.factory('spotify', function($cookies, $http) {
    var access_token = $cookies.get("spotify_access_token");
    var req = { headers: { 'Authorization': 'Bearer ' + access_token } };

    return {
        searchTrack: function(searchText) {
            searchText = encodeURIComponent(searchText);

            var searchUri = "https://api.spotify.com/v1/search?q=[query]&type=track&limit:1";
            searchUri = searchUri.replace("[query]", searchText);
            var promise = $http.get(searchUri, req).then(function (result) {
                return result.data.tracks.items[0];
            });

            return promise;
        },
        findTrack: function (searchText) {
            searchText = encodeURIComponent(searchText);
            
            var searchUri = "https://api.spotify.com/v1/search?q=[query]&type=track&limit:1";
            searchUri = searchUri.replace("[query]", searchText);
            $http.get(searchUri, req).then(function (data) {
                
            });
        },
        getPlaylists: function() {
            var requestUrl = "https://api.spotify.com/v1/me/playlists";

            return $http.get(requestUrl, req);
        },
        addSongToList: function(songUri, playlist, user) {
            var postUri = "https://api.spotify.com/v1/users/[user]/playlists/[playlist]/tracks?uris=" + songUri;
            postUri = postUri.replace("[playlist]", playlist);
            postUri = postUri.replace("[user]", user);
            console.log(songUri);

            return $http({
                method: "POST",
                url: postUri,
                headers: { 'Authorization': 'Bearer ' + access_token }
            });
        },
        getProfile: function() {
            return $http.get("https://api.spotify.com/v1/me", req);
        }
    };
});

app.factory('setlistfm', function($cookies, $http) {
    return {
        getArtist: function(bandName) {
            bandName = encodeURIComponent(bandName);
            return $http.get('/getArtist?artist=' + bandName);
        },
        getArtists: function(bandName) {
            bandName = encodeURIComponent(bandName);
            return $http.get('/searchSetlistfmArtist?artist=' + bandName);
        },
        getSetlist: function(bandId, setIndex) {
            return $http.get('/getSetlist', { params: { id: bandId, index: setIndex } });
        }
    };
});