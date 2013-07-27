package utils

import (
	"net/http"
	"strconv"
	"regexp"
	"fmt"
)

type Rule struct {
	Number bool
	Min int
	Max int
	Regex  string
	Values []string
}

const (
	ERR_VALUE_OUT_OF_RANGE = "Value of %v is out of permitted range"
	ERR_VALUE_OUT_OF_SIZE = "Value of %v is out of permitted size"
	ERR_VALUE_HAS_WRONG_FORMAT = "Value of %v has wrong format"
)

var lastValidationError error

func GetLastValidationError() error{
	return lastValidationError
}

func CheckValue(request *http.Request, name string, rule Rule) bool {
	value := request.FormValue(name)
	if rule.Number {
		number, err := strconv.Atoi(value)
		if err != nil {
			lastValidationError = err
			return false
		}
		if number < rule.Min ||
			number > rule.Max {
				lastValidationError = fmt.Errorf(ERR_VALUE_OUT_OF_RANGE, name)
				return false
		}
	} else {
		if len(value) < rule.Min ||
			(rule.Max != 0 && len(value) > rule.Max) {
			lastValidationError = fmt.Errorf(ERR_VALUE_OUT_OF_SIZE, name)
			return false
		}
	}
	if rule.Regex != "" {
		matched, err := regexp.MatchString(rule.Regex, value)
		if err != nil {
			lastValidationError = err
			return false
		}
		if !matched {
			lastValidationError = fmt.Errorf(ERR_VALUE_HAS_WRONG_FORMAT, name)
			return false
		}
	}
	if len(rule.Values) > 0 {
		found := false
		for _, v := range rule.Values {
			if v == value {
				found = true
				break
			}
		}
		if !found {
			lastValidationError = fmt.Errorf(ERR_VALUE_HAS_WRONG_FORMAT, name)
			return false
		}
	}
	return true
}
