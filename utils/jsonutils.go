package utils

import (
	"fmt"
	"log"
	"net/http"
	"encoding/json"
	"appengine/datastore"
)

const (
	MSG_WRONG_PARAMETERS = "Wrong parameters"
	JSON_RESULT_SUCCESS = "{\"result\":\"success\"}"
	JSON_MIME_TYPE = "application/json"
	CONTENT_TYPE_KEY = "content-type"
)

func SetJsonContentType(response http.ResponseWriter) {
	response.Header().Set(CONTENT_TYPE_KEY, JSON_MIME_TYPE)
}

func WriteSuccessJsonResponse(response http.ResponseWriter) {
	WriteJsonResponse(response, JSON_RESULT_SUCCESS)
}

func WriteJsonResponse(response http.ResponseWriter, responseString string) {
	SetJsonContentType(response)
	fmt.Fprint(response, responseString)
}

func WriteJsonKeysList(response http.ResponseWriter, keys []*datastore.Key) {
	SetJsonContentType(response)
	result := "["
	for _, key := range keys {
		result += "\"" + key.Encode() + "\","
	}
	result += "]"
	fmt.Fprint(response, result)
}

func WriteJsonResponseObject(response http.ResponseWriter, object interface{}) {
	SetJsonContentType(response)
	bAnswer, err := json.Marshal(object)
	if err != nil {
		log.Fatal(err)
	}
	response.Write(bAnswer)
}