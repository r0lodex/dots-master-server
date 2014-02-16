package handler

import (
	"net/http"

	"utils"
)

func init() {
	http.HandleFunc("/login", loginHandler)
}

func loginHandler(response http.ResponseWriter, request *http.Request) {
	utils.WriteJsonResponse(response, "{\"test\":\"pass\"}")
}
