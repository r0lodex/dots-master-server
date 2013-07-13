package handler

import (
	"net/http"
	"github.com/truefedex/dots-master-server/utils"
)

func init() {
	http.HandleFunc("/login", loginHandler)
	http.HandleFunc("/", defaultHandler)
}

func defaultHandler(response http.ResponseWriter, request *http.Request) {
	utils.WriteJsonResponse(response, "{\"test\":\"pass\"}")
}

func loginHandler(response http.ResponseWriter, request *http.Request) {
	utils.WriteJsonResponse(response, "{\"test\":\"pass\"}")
}
