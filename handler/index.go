package handler

import (
	"net/http"
)

const (
	INDEX_FILE_PATH        = "/html5client/index.html"
)

func init() {
	http.HandleFunc("/", indexHandler)
}

func indexHandler(response http.ResponseWriter, request *http.Request) {
	http.Redirect(response, request, INDEX_FILE_PATH, http.StatusFound)
}