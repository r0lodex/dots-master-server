package model

import (
	"time"
)

const DB_KIND_USER = "User"

type User struct {
	Login      string
	Password   string
	Alias      string
	Email      string
	Verified   bool
	Registered time.Time
}
