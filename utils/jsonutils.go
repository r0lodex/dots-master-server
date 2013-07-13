package utils

import (
	"fmt"
	"net/http"
)

const MSG_WRONG_PARAMETERS = "Wrong parameters"
const JSON_RESULT_SUCCESS = "{\"result\":\"success\"}"

func WriteJsonResponse(response http.ResponseWriter, responseString string) {
	response.Header().Set("content-type", "application/json")
	fmt.Fprint(response, responseString)
}