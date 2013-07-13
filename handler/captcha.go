package handler

import (
	"appengine"
	"appengine/datastore"
	"errors"
	"fmt"
	"image"
	"image/draw"
	"image/png"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"github.com/truefedex/dots-master-server/model"
	"github.com/truefedex/dots-master-server/utils"
	"strconv"
	"time"
)

const (
	KEY_CAPTCHA_ID        = "captcha_id"
	ERR_CAPTCHA_NOT_FOUND = "Captcha not found"
	ERR_CAPTCHA_VIEWED    = "One captcha can be viewed only once"
	SECTION_WIDTH         = 23
	SECTION_HEIGHT        = 38
)

func init() {
	http.HandleFunc("/captcha/gen", captchaGenHandler)
	http.HandleFunc("/captcha/image", captchaImageHandler)
	rand.Seed(time.Now().Unix())
}

func captchaGenHandler(response http.ResponseWriter, request *http.Request) {
	context := appengine.NewContext(request)
	garbageOldCaptchas(context)
	captcha := model.Captcha{ 
		Value:       strconv.Itoa(rand.Intn(999999)),
		GeneratedAt: time.Now(),
		Viewed:      false,
	}
	key, err := datastore.Put(context, datastore.NewIncompleteKey(context, model.DB_KIND_CAPTCHA, nil), &captcha)
	if err != nil {
		log.Fatal(err)
	}
	utils.WriteJsonResponse(response, fmt.Sprintf("{\"id\":\"%v\"}", key.Encode()))
}

func captchaImageHandler(response http.ResponseWriter, request *http.Request) {
	context := appengine.NewContext(request)
	if request.FormValue(KEY_CAPTCHA_ID) == "" {
		http.Error(response, utils.MSG_WRONG_PARAMETERS, http.StatusBadRequest)
		return
	}

	key, err := datastore.DecodeKey(request.FormValue(KEY_CAPTCHA_ID))
	if err != nil {
		log.Fatal(err)
	}

	captcha := new(model.Captcha)
	err = datastore.Get(context, key, captcha)
	if err != nil {
		http.Error(response, ERR_CAPTCHA_NOT_FOUND, http.StatusNotFound)
		return
	}
	if captcha.Viewed {
		http.Error(response, ERR_CAPTCHA_VIEWED, http.StatusForbidden)
		return
	}
	captcha.Viewed = true
	key, err = datastore.Put(context, key, captcha)
	if err != nil {
		log.Fatal(err)
		return
	}

	response.Header().Set("content-type", "image/png")
	png.Encode(response, genCaptchaImage(captcha.Value))
}

func garbageOldCaptchas(context appengine.Context) {
	duration, err := time.ParseDuration("-1h")
	query := datastore.NewQuery(model.DB_KIND_CAPTCHA).
		Filter("GeneratedAt <", time.Now().Add(duration)).
		KeysOnly()
	keys, err := query.GetAll(context, nil)
	if err != nil {
		log.Fatal(err)
		return
	}
	if len(keys) == 0 {
		return
	}
	err = datastore.DeleteMulti(context, keys)
	if err != nil {
		log.Fatal(err)
		return
	}
}

func genCaptchaImage(value string) image.Image {
	resultImage := image.NewNRGBA(image.Rect(0, 0, SECTION_WIDTH*len(value), SECTION_HEIGHT))
	//draw digits on base image
	for i, char := range value {
		// Open the file.
		fileName := fmt.Sprintf("assets/captcha/%c.png", char)
		file, err := os.Open(fileName)
		if err != nil {
			log.Fatal(err)
		}
		defer file.Close()

		// Decode the image.
		digitImage, _, err := image.Decode(file)
		if err != nil {
			log.Fatal(err)
		}
		draw.Draw(resultImage,
			image.Rect(i*SECTION_WIDTH, 0, (i+1)*SECTION_WIDTH, SECTION_HEIGHT),
			digitImage, image.Pt(0, 0), draw.Src)
	}
	bounds := resultImage.Bounds()
	//make vertical waves
	amplitude, phase, freq, dfreq := randomizeWaveParams()
	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		shift := int(math.Sin(phase) * amplitude)
		if shift < 0 {
			for x := bounds.Min.X; x < bounds.Max.X; x++ {
				if (x + shift) > bounds.Min.X {
					pixel := resultImage.At(x, y)
					resultImage.Set(x+shift, y, pixel)
				}
			}
		} else {
			for x := bounds.Max.X - 1; x >= bounds.Min.X; x-- {
				if (x + shift) < (bounds.Max.X - 1) {
					pixel := resultImage.At(x, y)
					resultImage.Set(x+shift, y, pixel)
				}
			}
		}
		phase += math.Abs(freq)
		freq += dfreq
	}
	//make horizontal waves
	amplitude, phase, freq, dfreq = randomizeWaveParams()
	for x := bounds.Min.X; x < bounds.Max.X; x++ {
		shift := int(math.Sin(phase) * amplitude)
		if shift < 0 {
			for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
				if (y + shift) > bounds.Min.Y {
					pixel := resultImage.At(x, y)
					resultImage.Set(x, y+shift, pixel)
				}
			}
		} else {
			for y := bounds.Max.Y - 1; y >= bounds.Min.Y; y-- {
				if (y + shift) < (bounds.Max.X - 1) {
					pixel := resultImage.At(x, y)
					resultImage.Set(x, y+shift, pixel)
				}
			}
		}
		phase += math.Abs(freq)
		freq += dfreq
	}
	return resultImage
}

func randomizeWaveParams() (amplitude, phase, freq, dfreq float64) {
	amplitude = rand.Float64()*3 + 1
	phase = rand.Float64() * math.Pi * 2
	freq = rand.Float64()*0.2 + 0.05
	dfreq = rand.Float64()*0.03 - 0.005
	return
}

func CheckCaptcha(context appengine.Context, id, value string) (bool, error) {
	key, err := datastore.DecodeKey(id)
	if err != nil {
		return false, err
	}

	captcha := new(model.Captcha)
	err = datastore.Get(context, key, captcha)
	if err != nil {
		return false, errors.New(ERR_CAPTCHA_NOT_FOUND)
	}

	err = datastore.Delete(context, key)
	if err != nil {
		log.Fatal(err)
	}

	return captcha.Value == value, nil
}
