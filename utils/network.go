package utils

import (
	"strings"
	"strconv"
	"errors"
)

const (
	ERR_WRONG_FORMAT = "Wrong format"
)

func slitIPAndPort(iPAndPort string) (ip string, port int, err error) {
	addresses := strings.Split(iPAndPort, ":")
	if len(addresses) < 2 {
		err = errors.New(ERR_WRONG_FORMAT)
		return
	}
	ip = addresses[0]
	port, err = strconv.Atoi(addresses[1])
	return
}