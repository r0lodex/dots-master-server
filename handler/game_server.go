package handler

import (
	"net/http"
	"github.com/truefedex/dots-master-server/utils"
)

func init() {
	http.HandleFunc("/gamesrv/ping", gameSrvPingHandler)
	http.HandleFunc("/gamesrv/register", gameSrvRegisterHandler)
}

func gameSrvRegisterHandler(response http.ResponseWriter, request *http.Request) {
	utils.WriteJsonResponse(response, "{\"test\":\"pass\"}")
}

func gameSrvPingHandler(response http.ResponseWriter, request *http.Request) {
	utils.WriteJsonResponse(response, "{\"test\":\"pass\"}")
}
