function html5clientpreconditions() {
	var overriddenMethod = NetworkGameScreen.prototype.onReadyToConnect;
	NetworkGameScreen.prototype.onReadyToConnect = function () {
		var that = this;
		$.ajax("/api/gamesrv/servers-list", {type: "GET",
			dataType: "json",
			success:function(servers, textStatus, jqXHR){
				if (servers.length == 0) {
					ui.pushController(new GameOverScreen('Problem retrieving servers list: no game servers found'));
					return;
				}
				choosedServer = Math.floor((Math.random() * servers.length));
				NETWORK_GAME_ADDRESS = servers[choosedServer].Address;
				overriddenMethod.call(that);
			},
			error: function(jqXHR, textStatus, errorThrown){
				ui.pushController(new GameOverScreen('Problem retrieving servers list: ' + textStatus));
			}}
		);
	}
}
