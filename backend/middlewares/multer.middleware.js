import multer from "multer";
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, './public/temp')
    },
    filename: function (req, file, cb) {
      cb(null, `${file.fieldname}_${Date.now()}.jpeg`)
    }
  })

export const upload = multer({ storage: storage })

