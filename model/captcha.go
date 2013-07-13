package model

import (
	"time"
)

const DB_KIND_CAPTCHA = "Captcha"

type Captcha struct {
	Value       string
	GeneratedAt time.Time
	Viewed		bool
}
