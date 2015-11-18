/**
 * Created by Administrator on 2015/11/18.
 */
var async = require('async');
var express = require('express');
var User = require('../models/User');
var VerifyCode = require('../models/VerifyCode');
var config_common = require('../configs/config_common');

module.exports = function() {
    var api = express.Router();

    api.get('/exist/:phone',function(req, res, next) {
        if(!config_common.checkPhone(req.params.phone)) {
            return next('invalid_format');
        }
        User.count({phone: req.params.phone},function(err, count) {
            if(err) {
                return next(err);
            }
            config_common.sendData(req, {conut: count}, next);
        });
    });

    api.get('/get_verify_code/:phone',function(req, res, next) {
        if(!config_common.checkPhone(req.params.phone)) {
            return next('invalid_format');
        }
        async.waterfall([
            function(cb){
                User.count({phone: req.params.phone}, function(err, count) {
                    if(err) {
                        return cb(err);
                    }
                    if(count > 0){
                        return cb('phone_is_used');
                    }
                    cb();
                });
            },
            function(cb){
                VerifyCode.findOne({phone: req.params.phone}, cb);
            },
            function(codeData, cb){
                if(!codeData){
                    var verify_code = new VerifyCode({code:config_common.getVerifyCode(), phone:req.params.phone, time:new Date()});
                    verify_code.save(cb);
                }else{
                    if(Date.now() - codeData.time.getTime() < config_common.verify_codes_resend) {
                        cb('too_frequent');
                    } else {
                        codeData.code = config_common.getVerifyCode();
                        codeData.time = new Date();
                        codeData.markModified('time');
                        codeData.save(cb);
                    }
                }
            }
        ],function(err, result){
            if(err){
                return next(err);
            }
            config_common.sendData(req, result, next);
        });
    });

    return api;
};