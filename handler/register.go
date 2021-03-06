package handler

import (
	"appengine"
	"appengine/datastore"
	"appengine/mail"
	"fmt"
	"log"
	"net/http"
	"time"

	"model"
	"base"
	"utils"
)

const (
	KEY_LOGIN       = "login"
	KEY_EMAIL       = "email"
	KEY_PASSWORD    = "password"
	KEY_ALIAS       = "alias"
	KEY_CAPTCHA_VAL = "captcha_value"
	KEY_USER        = "user"

	HANDLER_PATH_CONFIRM = "/confirm"

	ERR_USERNAME_CONFLICT = "User with such login already exists"
	ERR_EMAIL_CONFLICT    = "User with such email already exists"
	ERR_CAPTCHA_NOT_PASS  = "Captcha not passed"
	ERR_CANT_SEND_EMAIL   = "Couldn't send email: %v"

	CONFIRM_REGISTRATION = "Please confirm your email address"

	CONFIRM_MAIL_BODY = `<html><body>

<a href="%s">Click here</a> to confirm your email address.<br />

If the above link does not work, you can paste the following address into your browser: <br />

%s <br />

You will be asked to log into your account to confirm this email address. <br />

Thank you for plaing Dots! <br />

PhloX Development Team<br />
<a href="http://phlox.com.ua">http://phlox.com.ua</a> <br />

</body></html>`

)

func init() {
	http.HandleFunc("/register", registerHandler)
	http.HandleFunc(HANDLER_PATH_CONFIRM, confirmHandler)
}

func registerHandler(response http.ResponseWriter, request *http.Request) {
	if !(utils.CheckValue(request, KEY_LOGIN, utils.Rule{Min: 3, Max: 100}) &&
		utils.CheckValue(request, KEY_PASSWORD, utils.Rule{Min: 3, Max: 100}) &&
		utils.CheckValue(request, KEY_ALIAS, utils.Rule{Min: 3, Max: 100}) &&
		utils.CheckValue(request, KEY_EMAIL, utils.Rule{Min: 3, Max: 500, Regex: "^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$"}) &&
		utils.CheckValue(request, KEY_CAPTCHA_ID, utils.Rule{Min: 1, Max: 100}) &&
		utils.CheckValue(request, KEY_CAPTCHA_VAL, utils.Rule{Min: 1, Max: 100})) {
		http.Error(response, utils.GetLastValidationError().Error(), http.StatusBadRequest)
		return
	}

	context := appengine.NewContext(request)

	query := datastore.NewQuery(model.DB_KIND_USER).
		Filter("Login =", request.FormValue(KEY_LOGIN)).KeysOnly()
	count, err := query.Count(context)
	if count != 0 {
		http.Error(response, ERR_USERNAME_CONFLICT, http.StatusConflict)
		return
	}

	query = datastore.NewQuery(model.DB_KIND_USER).
		Filter("Email =", request.FormValue(KEY_EMAIL)).KeysOnly()
	count, err = query.Count(context)
	if count != 0 {
		http.Error(response, ERR_EMAIL_CONFLICT, http.StatusConflict)
		return
	}

	passed, err := CheckCaptcha(context, request.FormValue(KEY_CAPTCHA_ID), request.FormValue(KEY_CAPTCHA_VAL))
	if !passed {
		if err != nil {
			log.Println(err)
		}
		http.Error(response, ERR_CAPTCHA_NOT_PASS, http.StatusNotAcceptable)
		return
	}

	user := model.User{
		Login:      request.FormValue(KEY_LOGIN),
		Password:   request.FormValue(KEY_PASSWORD),
		Alias:      request.FormValue(KEY_ALIAS),
		Email:      request.FormValue(KEY_EMAIL),
		Verified:   false,
		Registered: time.Now(),
	}
	key, err := datastore.Put(context, datastore.NewIncompleteKey(context, model.DB_KIND_USER, nil), &user)
	if err != nil {
		log.Fatal(err)
		return
	}

	url := "http://" + appengine.DefaultVersionHostname(context) + HANDLER_PATH_CONFIRM + "?" + KEY_USER + "=" + key.Encode()
	msg := &mail.Message{
		Sender:  base.PHLOX_CONNECT_EMAIL,
		To:      []string{request.FormValue(KEY_EMAIL)},
		Subject: CONFIRM_REGISTRATION,
		HTMLBody:    fmt.Sprintf(CONFIRM_MAIL_BODY, url, url),
	}
	err = mail.Send(context, msg)
	if err != nil {
		log.Println(err)
		http.Error(response, fmt.Sprintf(ERR_CANT_SEND_EMAIL, err), http.StatusInternalServerError)
		return
	}

	utils.WriteJsonResponse(response, utils.JSON_RESULT_SUCCESS)
}

func confirmHandler(response http.ResponseWriter, request *http.Request) {
	fmt.Fprint(response, request.FormValue(KEY_USER))
}
