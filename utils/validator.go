package utils

import (
	"log"
	"regexp"
)

type Rule struct {
	MinLen int
	MaxLen int
	Regex  string
	Values []string
}

func CheckValue(value string, rule Rule) bool {
	log.Println(value)
	if len(value) < rule.MinLen ||
		(rule.MaxLen != 0 && len(value) > rule.MaxLen) {
		return false
	}
	log.Println(value)
	if rule.Regex != "" {
		matched, err := regexp.MatchString(rule.Regex, value)
		if err != nil {
			log.Fatal(err)
		}
		if !matched {
			return false
		}
	}
	log.Println(value)
	if len(rule.Values) > 0 {
		found := false
		for _, v := range rule.Values {
			if v == value {
				found = true
				break
			}
		}
		if !found {
			return false
		}
	}
	return true
}
