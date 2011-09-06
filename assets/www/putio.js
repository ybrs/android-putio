/**
 * Copyright 2010 Felipe Lalanne
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */


/**
 * This library implements the API calls for the service put.io (http://put.io)
 * For more information on the API, see https://put.io/service/api
 * 
 * Requirements: jQuery 1.4.2 (version tested), only for the method callServerMethod.
 * I expect to relax this dependency on future versions.
 * 
 * Quick start.
 * 
 * Loading of the file creates a global function putio(api_key, api_secret, error_func)
 * that when called returns a new instance of the API. It receives as parameters
 *  - api_key: The user api key
 *  - api_secret: The user api secret
 *  - error_func: A callback function(error), that will be called if an error
 *      occurs in the call of a API.
 * 
 * Every asynchronous API method receives as first parameter a callback to process
 * the results of the method. The value passed to the callback depends on the type
 * of function, for instance. getItems() passes a list of items to the callback,
 * and getMessages passes a list of messages.
 * 
 * Quick example.
 *     
 * var api = putio(API_KEY, API_SECRET);
 *
 * // Write the list of base level items for the user
 * api.getItems(function(items) {
 *      for (var i = 0; i < items.length; i++) {
 *          $('body').('<p>' + items[i].name + "</p>");             
 *      }
 * });
 */
var putio = (function() {
    var RPC_URL = "http://api.put.io/v1"; // put.io api url
    var VERSION = '0.2.1'; // Library version
    
    // File type codes
    var FILETYPES = {
        'folder'     : 0,
        'file'       : 1,
        'audio'      : 2,
        'movie'      : 3,
        'image'      : 4,
        'compressed' : 5,
        'pdf'        : 6,
        'ms_doc'     : 7,
        'text'       : 8,
        'swf'        : 9
    };

    /**
     * Check if jQuery exists before continuing
     */
    if (typeof jQuery.get !== 'function') {
        alert('The put.io library requires that the jQuery library is present');
        return undefined;
    }
    
    /**
     * @param str string for which to remove the whitespace
     * @return string with removed whitespace from the beginning and end
     */
    function trim(str) {
        return str.replace(/^\s+|\s+$/g, "");
    }
    
    /**
     * Check if the given parameter is an array
     *
     * @param input object to check
     * @return true if the object is an array
     */
    function isArray(input){
        return typeof(input) == 'object' && (input instanceof Array);
    }
    
    /**
     * Converts the specified filetype string to put.io 
     * numeric type
     */
    function fileTypeToInt(filetype) {
        if (FILETYPES[filetype] === undefined) {
            throw "Unknown type. Please use one of these: folder, file, audio, movie, image, compressed, pdf, ms_doc, text, swf";
        }
        return FILETYPES[filetype];
    }
    
    /**
     * @return base object to extend by other objects
     */
    function BaseObj(args) {
        args = args || {};
        
        return args;
    }
    
    /**
     * @return base object for all objects generated from the Api
     */
    function BaseApiObj(api, args) {
        var that = BaseObj(args);
        
        that.getApi = function() {
            return api;
        };
        
        return that;
    }
    
    /**
     * Sample user:
     *
     * u.name                  : 'aft'
     * u.friends_count         : 497 
     * u.bw_avail_last_month   : '0'
     * u.bw_quota              : '161061273600' 
     * u.shared_items          : 3
     * u.bw_quota_available    : '35157040261' 
     * u.disk_quota            : '206115891200' 
     * u.disk_quota_available  : '158153510402' 
     * u.shared_space          : 0
     */
    function User(api, args) {
        return BaseApiObj(api, args);
    }
    
    /**
     * Sample friend
     *
     * f.dir_id    : '1407'
     * f.id        : '2'
     * f.name      : 'hasan'
     */
    function Friend(api, args) {
        var that = BaseApiObj(api, args);

        /**
         * Lists a friends shared items
         * 
         * @callback function([item Array]) to call if the request succeeds
         */
        that.getItems = function(callback, limit, offset, args) {
            this.getApi().getItems(callback, this.dir_id, limit, offset, args);
        };
        return that;
    }
    
    
    /**
     * Dashboard message objects.
     *  
     * Message Methods:
     * 
     * message.remove()
     *  
     * Message Attributes:
     *  
     * message.id (Integer) 
     * message.user_id (Integer) 
     * message.title (String)
     * message.description (None) 
     * message.importance (Integer)
     * message.file_name (String) 
     * message.file_type (String)
     * message.user_file_id (Integer) 
     * message.from_user_id (Integer.  If false, message is from Put.io) 
     * message.channel (Integer) 
     * message.hidden (Integer, 1 or 0)
     *  
     * Sample:
     *  
     * user_file_id = 4 
     * user_id = 17 
     * description = None 
     * title = '<a rel="userfile" "href="/file/4">abcd.mp4 </a> 
     *     <span class="dash-gray">(89.86K) downloaded</span>' 
     * importance = 0 
     * file_name = 'abcd.mp4'
     * id = 3773 
     * file_type = 'audio' 
     * hidden = 0 
     * from_user_id = None
     * channel = 2
     */
    function Message(api, args) {
        var that = BaseApiObj(api, args);
        /**
         * Deletes messages. 
         *
         * @param callback function(boolean) that will be if the request succeeds
         */
        that.remove = function(callback) {
            var params = {'id' : this.id };

            this.getApi().callServerMethod('/messages', 'delete', 
                function(results) {
                    if (callback) {
                        callback(true);
                    }
                }, params);
        };
        
        return that;
    }
    
    /**
     * For us, Url is a downloadable file link. These files can be any type.
     * Sources can be ftp, http, etc.
     *  
     * Url Attributes:
     *       
     *      instance.dl_handler  = 'Single Url'
     *      instance.name        = 'name_of_the_file.mp4'
     *      instance.file_type   = 'file'
     *      instance.error       = None
     *      instance.url         = 'ftp://a.b.c/name_of_the_file.mp4'
     *      instance.paid_bw     = 0
     *      instance.file_size   = '92014'
     *      instance.type_name   = 'file'
     *      instance.dltype      = 3
     *      instance.human_size  = '89.86K'
     */
    function Url(api, args) {
        var that = BaseApiObj(api, args);
        
        that.toString = function() {
            return this.url;
        };
        
        return that;
    }

    /**
     * Torrent objects are fetched via our Torrent clients. It can contain
     * single, multi part archive files, or any other file type. Send the
     * torrent URL, we figure out the rest.
     * 
     * Torrent Attributes:
     *     
     *     instance.dl_handler  = 'Torrent'
     *     instance.name        = 'ABCDE.avi'
     *     instance.file_type   = 'file'
     *     instance.file_size   = 244091464
     *     instance.url         = 'http://a.b/c.torrent'
     *     instance.paid_bw     = 0
     *     instance.error       = None
     *     instance.type_name   = 'file'
     *     instance.dltype      = 2
     *     instance.human_size  = '232.78M'
     */
    function Torrent(api, args) {
        return BaseApiObj(api, args);
    }


    /**
     * Multipart objects are files, which contains patterns like "part1",
     * "001", etc. These files are automatically extracted and saved to your
     * space.
     * 
     * Multipart Attributes:
     *     
     *  instance.name       = 'ABCDE'
     *  instance.size       = 366500388
     *  instance.human_size = 350.0M
     *  instance.paid_bw    = 366500388
     *  instance.parts      = 
     *  [
     *       {
     *         "url":"http:\/\/rapidshare.com\/files\/1\/M.part3.rar",
     *         "size":"47711664",
     *         "paid_bw":"47711664",
     *         "source":"rapidshare.com",
     *         "name":"Mdb35.part3.rar",
     *         "human_size":"45.5M",
     *         "type":"file",
     *         "needs_pass":0,
     *         "error": false
     *      },
     *      {
     *         "url":"http:\/\/rapidshare.com\/files\/2\/M.part1.rar",
     *         "size":"55000000",
     *         "paid_bw":"55000000",
     *         "source":"rapidshare.com",
     *         "name":"Mdb35.part1.rar",
     *         "human_size":"52.5M",
     *         "type":"file",
     *         "needs_pass":0,
     *         "error":null
     *      }
     *
     *  ]
     *  instance.error      = false
     */
    function Multipart(api, args) {
        return BaseApiObj(api, args);
    }
    
    /**
     * Transfer Methods:
     *      
     *     instance.destroyTransfer()
     *  
     * 
     * Transfer Attributes:
     *     
     *     instance.id
     *     instance.name
     *     instance.status
     *     instance.percent_done
     * 
     * 
     *     human_size  : 200.0M 
     *     name        : The.Messenger.DVDRip.XviD-AMIABLE.part1.rar 
     *     url         : http://rapidshare.com/files/3232/abc.part1.rar' 
     *     needs_pass  : 0, 
     *     source      : rapidshare.com', 
     *     paid_bw     : 209715200', 
     *     error       : None, 
     *     type        : file', 
     *     size        : 209715200'
     * 
     * Samples:
     *     
     *     instance.status       = 'Completed'
     *     instance.percent_done = '100'
     *     instance.id           = '45'
     *     instance.name         = 'A video file.avi'
     *     
     *     
     *     instance.status       : 'Waiting'
     *     instance.percent_done : '0'
     *     instance.id           : '47'
     *     instance.name         : 'abcde.mp4'
     */
    function Transfer(api, args) {
        var that = BaseApiObj(api, args);

        /**
         * Destroy this transfer object irreversibly
         *
         * @param callback function(success) to call when if the call succeeds
         */
        that.destroyTransfer = function(callback) {
            var params = { 'id' : this.id };

            this.getApi().callServerMethod('/transfers', 'cancel', 
                function(results) {
                    if (callback) {
                        callback(true);
                    }
                }, params);
        };
        
        return that;
    }
    
    /**
     * Url bucket is a completion of urls ready to fetch.
     *
     * UrlBucket Methods:
     *     
     *     bucket.add()
     *     bucket.analyze_and_add_urls()
     *     bucket.get_report()
     *     bucket.fetch()
     * 
     * Static Methods:
     *     
     *     extract_urls()
     *     crawl_webpage()
     * 
     * Abilities:
     *     
     *     - Add urls to the bucket
     *     - Get report of the bucket if you need to.
     *     - Fetch the urls
     *     
     *     You can also:
     *     - Analyze urls and add
     *     - Crawl a web page and extract URLs
     *     - Extract URLs from a text block
    */
    function UrlBucket(api, singleurl, torrenturl, multiparturl) {
        var that = BaseApiObj(api);

        var _last_analyzed_bw_avail = null;
        var _last_analyzed_disk_avail = null;
        var _req_space = null;
        var _paid_bw = null;

        var _links = { multiparturl : [], torrenturl : [], singleurl : [], 
            error : [] };
        
        function _add(singleurl, torrenturl, multiparturl, error, info) {
            singleurl = singleurl || [];
            torrenturl = torrenturl || [];
            multiparturl = multiparturl || [];
            error = error || [];
            info = info || [];

            var k, l;
            for (k in (l = [singleurl, torrenturl, multiparturl, error])) {
                if (!isArray(l[k])) {
                    throw "Add method takes only arrays as arguments";
                }
            }

            for (k = 0; k < singleurl.length; k++) {
                _links.singleurl[_links.singleurl.length] = singleurl[k];
            }

            for (k = 0; k < torrenturl.length; k++) {
                _links.torrenturl[_links.torrenturl.length] = torrenturl[k];
            }

            for (k = 0; k < multiparturl.length; k++) {
                _links.multiparturl[_links.multiparturl.length] = multiparturl[k];
            }

            for (k = 0; k < error.length; k++) {
                _links.error[_links.error.length] = error[k];
            }
            
            if (info.length > 0) {
                _last_analyzed_bw_avail = info.last_analyzed_bw_avail || 
                    _last_analyzed_bw_avail;
                _last_analyzed_disk_avail = info.last_analyzed_disk_avail || 
                    _last_analyzed_disk_avail;
                _req_space = info.req_space || _req_space;
                _paid_bw = info.paid_bw || _paid_bw;
            }
        }
        
        /* Update using the values passed as parameters */
        _add(singleurl, torrenturl, multiparturl);
        
        
        /**
         * @return the required space by this bucket
         */
        that.getReqSpace = function() {
            return _req_space;
        };
        
        /**
         * @return The baid bandwidth that will be used by
         * this bucket
         */
        that.getPaidBw = function() {
            return _paid_bw;
        };
        
        /**
         * @return list of single urls for this bucket
         */
        that.getSingleUrls = function() {
            return _links.singleurl;
        };
        
        /**
         * @return list of torrent urls for this bucket
         */
        that.getTorrentUrls = function() {
            return _links.torrenturl;
        };
        
        /**
         * @return list of multipart urls for this bucket
         */
        that.getMultipartUrls = function() {
            return _links.multiparturl;
        };
        
        /**
         * @return list of error urls for this bucket
         */
        that.getErrorUrls = function() {
            return _links.errorurl;
        };
        
        /**
         * Takes: String or array
         * Returns: Dictionary of bucket items
         * 
         * Adds url(s) to the bucket to analyze or fetch. We recommend using
         * analyze() method instead.
         */
        that.add = function(url) {
            var args = {};
            if (url && typeof url === 'string') {
                args = {'url' : url};
                _links.singleurl[_links.singleurl.length] = Url(this.getApi(), args);
            }
            else if (url && isArray(url)) {
                for (var k = 0; k < url.length; k++) {
                    args = {'url' : url[k]};
                    _links.singleurl[_links.singleurl.length] = Url(this.getApi(), 
                        args);
                }
            }
            else {
                throw "Add method takes only a string or an array as argument";
            }

            return _links;
        };
        
        /**
         * Returns the report of your bucket's last analyzation. Each UrlBucket
         * has its own report. After updating a bucket, remember to check its
         * new report.
         * 
         * Analyzed urls return like this one:
         * 
         * {
         *     'dl_handler': 1,
         *     'name': 'Itemname.ext',
         *     'file_type': 1,
         *     'error': None,
         *     'url': 'http://torrent.a.b/file.torrent',
         *     'paid_bw': 0,
         *     'file_size': 244091464,
         *     'type_name': 'file',
         *     'dltype': 2,             #fixme whats this?
         *     'human_size': '232.78M'
         * }
         */
        that.getReport = function() {
            return {"Current Available Disk Space": _last_analyzed_disk_avail,
                "Current Available Bandwidth": _last_analyzed_bw_avail,
                "Required Space": _req_space,
                "Bandwidth to be deducted from quota": _paid_bw,
                "Urls": _links};
        };
        
        
        /**
         * Initiates fetching all the links of the given URL Bucket instance.
         *
         * Returns newly added transfers. Erroneous transfers will have the word
         * "Error" in "status".
         *
         * @param callback function([Transfer Array]) where the list of transfers will 
         *      be passed if the request succeeds.
         */
        that.fetch = function(callback) {
            var go_fetch = [];        
            var key, i;
            for (key in _links) {
                if (_links.hasOwnProperty(key)) { 
                    if (key == 'error') {
                        continue;
                    }
                    
                    for (i = 0; i < _links[key].length; i++) {
                        go_fetch[go_fetch.length] = _links[key][i].url;
                    }
                }
            }
            
            var params = {'links' : go_fetch };
            var api = this.getApi();

            api.callServerMethod('/transfers', 'add', function(results) {
                if (callback) {
                    var transfers = [];
                    for (i = 0; i < results.length; i++) {
                        transfers[transfers.length] = Transfer(api, results[i]);
                    }

                    /* Pass the transfer list to the callback */
                    callback(transfers);
                }
            }, params);
        };
        
        /**
         * Analyzes the bucket or, if given, the list of urls provided and 
         * passes an updated bucket with the urls that put.io can fetch to the
         * provided callback.
         *
         * Example:
         *     Analyze the provided list of links and fetch the new bucket
         *
         *     bucket.analyze(function(new_bucket) {
         *         new_bucket.fetch();
         *     }, array);
         *     
         * @param callback function([Bucket Object]) where the updated bucket will be
         *     passed if the request succeeds.
         * @param links array of urls as strings or an array of url objects.
         */
        that.analyze = function(callback, links) {
            links = links || [];

            if (!isArray(links)) {
                throw "Analyze method takes a list. Use " + 
                    "extract_urls() to convert string of urls to a list.";
            }

            var go_analyze = [];
            var k, i;
            for (k = 0; k < links.length; k++) {
                go_analyze[go_analyze.length] = links[k].toString();
            }
            
            /* Add also the links already included in this bucket */
            for (k in _links) {
                if (_links.hasOwnProperty(k)) { 
                    if (k == 'error') {
                        continue;
                    }
                    
                    for (i = 0; i < _links.length; i++) {
                        go_analyze[go_analyze.length] = _links[k][i].url;
                    }
                }
            }

            var params = { 'links' : go_analyze };

            /* Reference this bucket */
            var bucket = this;

            this.getApi().callServerMethod('/urls', 'analyze', 
                function(results) {
                    var multipart_urls  = [];
                    var single_urls     = [];
                    var torrent_urls    = [];
                    var error_urls      = [];

                    var paid_bw = 0;
                    var req_space = 0;

                    var i,k,r;
                    for (k = 0; k < results.items.multiparturl.length; k++) {
                        r = results.items.multiparturl[k];

                        paid_bw  += r.paid_bw;
                        req_space  += r.size;

                        for (i = 0; i < r.parts.length; i++) {
                            multipart_urls[multipart_urls.length] = 
                                Multipart(bucket.getApi(), r.parts[i]);
                        }
                    }

                    for (k = 0; k < results.items.torrent.length; k++) {
                        r = results.items.torrent[k];

                        torrent_urls[torrent_urls.length] = 
                            Torrent(bucket.getApi(), r);

                        paid_bw  += r.paid_bw;
                        req_space  += r.size;
                    }

                    for (k = 0; k < results.items.singleurl.length; k++) {
                        r = results.items.singleurl[k];

                        single_urls[single_urls.length] = Url(bucket.getApi(), r);

                        paid_bw  += r.paid_bw;
                        req_space  += r.size;
                    }
 
                    for (k = 0; k < results.items.error.length; k++) {
                        error_urls[error_urls.length] = Url(results.items.error[k]);
                    }

                    // Reset the links before updating the info
                    _links = { 'multiparturl' : [], 'torrenturl' : [], 
                        'singleurl' : [], 'error' : [] };

                    _add(single_urls, torrent_urls, multipart_urls, error_urls, {
                        last_analyzed_disk_avail : results.disk_avail,
                        last_analyzed_bw_avail : results.bw_avail,
                        paid_bw : paid_bw,
                        req_space : req_space});

                    if (callback) {
                        callback(bucket);
                    }

                }, params);
        };
        
        /**
         * Extracts a list of usable urls from the specified text
         * and passes the list of urls to the provided
         * callback
         *
         * @param callback function([String Array]) where the list of urls will be passed
         *      if the request succeeds.
         * @param text text where the urls will be extracted
         */
        that.extractUrls = function(callback, text) {
            if (!callback) {
                return;
            }
            var params = { 'txt' : text };

            this.getApi().callServerMethod('/urls', 'extracturls', 
                function(results) {
                    var urls = [];
                    
                    // TODO: Lookup the result of this remote call
                    // to see if results is really an array or an object
                    for (var k = 0; k < results.length; k++) {
                        urls[urls.length] = results[k].url;
                    }

                    callback(urls);
                }, params);
        };

        return that;
    }
    
    /**
     * An item can be a file or a folder.
     *  
     * Avaiable Item methods are:
     *     
     *     item.renameItem()
     *     item.moveItem()
     *     item.remove()
     *     item.updateInfo()
     *     item.getDownloadUrl()
     *     item.getZipUrl()
     *     item.getStreamUrl()
     *  
     * Available Item attributes:
     * Sizes are in bytes. Use human_size(byte) to convert if necessary.
     *     
     *     item.id
     *     item.name
     *     item.type
     *     item.size
     *     item.is_dir
     *     item.parent_id
     *     item.screenshot_url
     *     item.thumb_url
     *     item.file_icon_url
     *     item.download_url
     * 
     * Example Folder Item:
     *     
     *     "id":"4394",
     *     "name":"Billie Ray Martin The Crackdown Project - Vol 1",
     *     "type":"folder",
     *     "size":"23472048",
     *     "is_dir":true,
     *     "parent_id":"0",
     *     "screenshot_url":"http://put.io/screenshot/b/dgRraFxlXmNl.jpg",
     *     "thumb_url":"http://put.io/screenshot/dgRraFxlXmNl.jpg",
     *     "file_icon_url":"http://put.io/images/file_types/folder.png",
     *     "folder_icon_url":"",
     *     "download_url":"http://node2.endlessdisk.com/download-file/17/4394",
     *     "zip_url":"/stream-basket/17/4394"}
     * 
     * 
     * at the moment, type can be a:
     *     
     *     folder
     *     file
     *     audio
     *     movie
     *     image
     *     compressed
     *     pdf
     *     ms_doc
     *     text
     *     swf
     *     unknown
     */
    function Item(api, args) {
        var that = BaseApiObj(api, args);
        
        /**
         * Renames the item and passes the updated object 
         * to the provided callback.
         *
         * @param callback function([Item Object]) where the updated item
         *     will be passed if the request succeeds.
         * @param name updated name for the item.
         */
        that.renameItem = function(callback, name) {
            if (!name) {
                return;
            }

            var params = { 'name' :  name, 'id' : this.id };
            var item = this;

            this.getApi().callServerMethod('/files', 'rename',
                    function(results) {
                        if (results.length > 0) {
                            /* Update the original item */
                            item.name = results[0].name;

                            /* Pass the new item to the callback */
                            if (callback) {
                                callback(Item(item.getApi(), results[0]));
                            }
                        }
                    }, params);
        };
        
        /**
         * Moves the item to another folder. target_id = 0 is the root folder.
         * Passes the updated item to the provided callback.
         *
         * @param callback function([Item Object]) where the updated Item will
         *     be passed if the request succeds.
         * @param target_id id of the target folder. Defaults to 0.
         */
        that.moveItem = function(callback, target_id) {
            target_id = target_id || 0;

            var params = {'id' : this.id, 'parent_id' : target_id };
            var item = this;

            this.getApi().callServerMethod('/files', 'move',
                function(results) {
                    if (results.length > 0) {
                        /* Update the original item */
                        item.parent_id = results[0].parent_id;

                        /* Pass the new item to the callback */
                        if (callback) {
                            callback(Item(item.getApi(), results[0]));
                        }
                    }
                }, params);

        };
        
        /**
         * Destroys the item permanently. Calls the callback function
         * if the request was succesfull
         *
         * @param callback function([boolean]) that will be called if the 
         *     request succeeds.
         */  
        that.remove = function(callback) {
            var params = { 'id' : this.id };

            this.getApi().callServerMethod('/files', 'delete',
                function(results) {
                    /* Pass the new item to the callback */
                    if (callback) {
                        callback(true);
                    }
                }, params);
        };
        
        /**
         * Refreshes the items attributes.  Useful for folders, because folders
         * can be updated via subscriptions in the background. It passes the 
         * updated item to the callback function.
         *
         * @param callback function([Item Object]) where the updated item 
         *     will be passed if the request succeeds.
         */
        that.updateInfo = function(callback) {
            var params = { 'id' : this.id };
            var item = this;

            this.getApi().callServerMethod('/files', 'info',
                    function(results) {
                        var key;
                        if (results.length > 0) {
                            // Update values in the current subscription.
                            for (key in results[0]) {
                                if (results[0].hasOwnProperty(key)) { 
                                    item[key] = results[0][key];
                                }
                            }

                            /* Pass the new item to the callback */
                            if (callback) {
                                callback(Item(item.getApi(), results[0]));
                            }
                        }
                    }, params);
        };
        
        /**
         * @return a string with the download url or null if the item is a folder.
         */
        that.getDownloadUrl = function() {
            if (this.is_dir) {
                return null;
            }
            
            return this.download_url;
        };
        
        /**
         * @return the stream url of the item. If the item is a folder, then null will be returned.
         *      the item is assumed to be updated.
         */
        that.getStreamUrl = function() {
            if (this.is_dir) {
                return null;
            }

            var sturl = this.stream_url + '/atk/' + this.getApi().access_token;
            return sturl;
        };
        
        /* TODO */
        that.createMp4 = function() {
            return false;
        };
        
        return that;
    }
    
    
    /**
     * Folders inherit from item. Check Item class documentation for more info.
     * 
     * Sample:
     *      
     *     folder.id               =  4394
     *     folder.name             =  "Billie Ray Martin The Crackdown Project"
     *     folder.type             =  "folder"
     *     folder.size             =  23472048
     *     folder.is_dir           =  True
     *     folder.parent_id        =  0
     *     folder.screenshot_url   =  "/images/file_types/file.png"
     *     folder.thumb_url        =  "/images/file_types/file.png"
     *     folder.file_icon_url    =  "/images/file_types/folder.png"
     *     folder.folder_icon_url  =  ""
     *     folder.download_url     =  "http://XX.put.io/download-file/17/4394"
     *     folder.zip_url          =  "http://XX.put.io/stream-basket/17/4394"
     */
    function Folder(api, args) {
        var that = Item(api, args); //inherit from item

        /**
         * Create a new folder under the current one. Makes use of api.create_folder()
         *
         * @param callback function where the created folder will be passed
         * @param name name for the new folder. Defaults to 'New Folder'
         */
        that.createFolder = function(callback, name) {
            return this.getApi().createFolder(callback, name, this.id);
        };
        
        return that;
    }
    
    
    /**
     * Subscription Methods:
     * 
     *     edit()
     *     delete()
     *     toggle_status()
     *     undate_info()
     *     add_do_filters()
     *     add_dont_filters()
     * 
     * 
     * Subscription Attributes:
     *     
     *     subsitem.id                  (integer)
     *     subsitem.url                 (string)
     *     subsitem.name                (string)
     *     subsitem.do_filters          (strings, seperated by commas)
     *     subsitem.dont_filters        (strings, seperated by commas)
     *     subsitem.parent_folder_id    (integer)
     *     subsitem.last_update_time    (string)
     *     subsitem.next_update_time    (string)
     *     subsitem.paused              (boolean)
     *  
     * Example:
     *     api.getSubscriptions(function(subscriptions) {
     *         for (i in subscriptions) {
     *             alert(subscriptions[i].name);
     *         }
     *     });
     * 
     * Sample Values:
     *     
     *     subsitem.id                =  860
     *     subsitem.url               =  "http://legaltorrents.com/music/rss.xml"
     *     subsitem.name              =  "Jazz Radio"
     *     subsitem.do_filters        =  "jazz, mp3"
     *     subsitem.dont_filters      =  "smooth, wav"
     *     subsitem.parent_folder_id  =  234
     *     subsitem.last_update_time  =  "2010-01-01 00:00"
     *     subsitem.next_update_time  =  "2010-01-01 00:00"
     *     subsitem.paused            =  False
     */
    function Subscription(api, args) {
        var that = BaseApiObj(api, args);
        
        /**
         * Changes values in the subscription attributes.
         *
         * @param callback function([subscription Object]) where the updated subscription
         *     will be passed if the request succeeds
         * @param args list of arguments to modify
         */
        that.edit = function(callback, args) {
            // No sense in making an api call if there is nothing to change
            if (!args || args.length === 0) {
                return;
            }
        
            var params = { 'id' : this.id, 'title' : this.name, 'url' : this.url };
            var key;             
            for (key in args) {
                if (args.hasOwnProperty(key)) {
                    params[key] = args[key];
                }
            }

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'edit', 
                function(results) {
                    var key;
                    if (results.length > 0) {
                        /* Update values in the current subscription */
                        for (key in results[0]) {
                            if (results[0].hasOwnProperty(key)) {
                                subscription[key] = results[0][key];
                            }
                        }

                        if (callback) {
                            /* Pass a newly created subscription to the callback */
                            callback(Subscription(subscription.getApi(), results[0]));
                        }
                    }
                }, params);
        };
        
        /**
         * Deletes permanently the subscription
         *
         * @param callback function(success) to call if the request succeds 
         */
        that.remove = function(callback) {
            var params = { 'id' : this.id };

            this.getApi().callServerMethod('/subscriptions', 'delete', 
                function(results) {
                    if (callback) {
                        callback(true);
                    }
                }, params);
        };
        
        
        /**
         * Toggles the activity status of a subscription item. You may also
         * change this value by editing the subscription item. This is just a
         * shortcut we use.
         *  
         * @params callback function([subscription Object]) where the updated status 
         *     will be passed if the request succedds
         */
        that.toggleStatus = function(callback) {
            var params = { 'id' : this.id };

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'pause', 
                function(results) {
                    if (results.length > 0) {
                        subscription.paused = results[0].paused;

                        if (callback) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(subscription.getApi(), results[0]));
                        }
                    }
                }, params);
        };
        
        /**
         * Refreshes the subscription info. Use this to get the latest info
         * about the subscriptions.
         *
         * @param callback function([subscription Object]) where the updated 
         *     subscription object will be passed if the request is successful.
        */
        that.updateInfo = function(callback) {
            var params = { 'id' : this.id };

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'info', 
                function(results) {
                    var key;
                    if (results.length > 0) {
                        /* Update values in the current subscription. */
                        for (key in results[0]) {
                            if (results[0].hasOwnProperty(key)) {
                                subscription[key] = results[0][key];
                            }
                        }

                        if (callback) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(subscription.getApi(), 
                                results[0]));
                        }
                    }
                }, params);
        };
        
        /** 
         * Private function to add a 
         * filter to the list 
         */
        function addFilter(filter, args) {
            var filters = filter.split(',');
            
            var i = filters.length, 
                k = 0;
                
            for (k = 0; k < args.length; k++) {
                filters[i++] = args[k];
            }

            for (k = 0; k < filters.length; k++) {
                filters[k] = trim(filters[k]);
            }

            return filters.join(',');
        }
        
        /**
         * Private function to remove a set of filters
         * to a the provided filter
         */
        function removeFilter(filter, args) {
            var filters = filter.split(',');
            
            var i = 0, j, k, ok;
            var new_filters = [];

            /* TODO: Is there a better way to implement this? */
            for (j = 0; j < filters.length; j++) {
                ok = true;
                for (k = 0; k < args.length; k++) {
                    /* We don't want this filter in the new list */
                    if (trim(filters[j]) === trim(args[k])) {
                        ok = false;
                        break;
                    }
                }

                if (ok) {
                    new_filters[i++] = trim(filters[j]);
                }
            }

            return new_filters.join(',');
        }
        
        /**
         * Adds keyword(s) to "do fetch" filter
         *
         * @param callback function([subscription Object]) where the updated subscription will
         *     be passed if the request succeeds.
         * @param args list of strings to use as do filter.
         */
        that.addDoFilters = function(callback, args) {
            args = args || [];

            var params = { 
                "id" : this.id,
                "title" : this.name,
                "url" : this.url,
                "do_filters" : addFilter(this.do_filters, args)
            };

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'edit', 
                function(results) {
                    if (results.length > 0) {
                        // Replace the current object's do filters
                        subscription.do_filters = results[0].do_filters;

                        if (callback) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(subscription.getApi(), 
                                results[0]));
                        }
                    }
                }, params);
        };
        
        /**
         * Adds keyword(s) to "dont fetch" filter
         *
         * @param callback function([subscription Object]) where the updated subscription will
         *     be passed if the request succeeds.
         * @param args list of strings to use as do filter.
         */
        that.addDontFilters = function(callback, args) {
            args = args || [];

            var params = { 
                "id" : this.id,
                "title" : this.name,
                "url" : this.url,
                "dont_filters" : addFilter(this.dont_filters, args)
            };

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'edit', 
                function(results) {
                    if (results.length > 0) {
                        subscription.dont_filters = results[0].dont_filters;

                        if (callback) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(subscription.getApi(), 
                                results[0]));
                        }
                    }
                }, params);
        };
        
        /**
         * Deletes keyword(s) to "do fetch" filter
         *
         * @param callback function([subscription Object]) where the updated subscription will
         *      be passed if the request succeeds.
         * @param args list of strings to use as do filter.
         */
        that.delDoFilters = function(callback, args) {
            args = args || [];

            var params = { 
                "id" : this.id,
                "title" : this.name,
                "url" : this.url,
                "do_filters" : removeFilter(this.do_filters, args)
            };

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'edit', 
                function(results) {
                    if (results.length > 0) {
                        subscription.do_filters = results[0].do_filters;

                        if (callback) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(subscription.getApi(),
                                results[0]));
                        }
                    }
                }, params);
        };
        
        /**
         * Deletes keyword(s) to "dont fetch" filter
         *
         * @param callback function([subscription Object]) where the updated subscription will
         *      be passed if the request succeeds.
         * @param args list of strings to use as do filter.
         */
        this.delDontFilters = function(callback, args) {
            args = args || [];

            var params = { 
                "id" : this.id,
                "title" : this.name,
                "url" : this.url,
                "dont_filters" : removeFilter(this.dont_filters, args)
            };

            /* Reference to this object to use in the callback */
            var subscription = this;

            this.getApi().callServerMethod('/subscriptions', 'edit', 
                function(results) {
                    if (results.length > 0) {
                        subscription.dont_filters = results[0].dont_filters;

                        if (callback) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(subscription.getApi(), 
                                results[0]));
                        }
                    }
                }, params);
        };
        
        return that;
    }
    
    /**
     * Defines an api request. This object is serialized when API calls are
     * made.
     * 
     * @param api_key the user api key
     * @param api_secret the user api_secret
     * @param params an array with the parameters for the request
     */
    function ApiRequest(api_key, api_secret, params) {
        if (!api_key || !api_secret) {
            return; //undefined
        }
        
        return {
            api_key : api_key,
            api_secret : api_secret,
            params : params || {},
            
            /**
             * Return a string containing this request as JSON. 
             * This method depends on the JSON.stringify method. 
             * 
             * TODO: Multible browser support has not been tested. 
             * For deployed applications this method should be rewritten or
             * the json2.js library, available in http://www.json.org/js.html, should
             * be used.
             */
            toString : function() {
                return JSON.stringify(this);
            }
        };
    }
    
    /**
     * @param msg Message returned from putio server
     * @param path Path in the server where the request was made
     * @param method Method call that generated the error
     * @param params Arguments given to the method call
     * @return an error object containing the provided information
     */
    function PutioError(msg, path, method, params) {
        return {
            msg : msg,
            path : path,
            method : method,
            params : params || {},
            toString : function() {
                return "An error ocurred on calling the method " + this.method +
                    " in path " + this.path + " with message: "+ this.msg;
            }
        };
    }
    
    /*
     * A JavaScript interface into the Put.io API
     *
     * Example usage:
     *     To create an instance of the putio.Api class, with authentication:
     *
     *     var api = Api(YOUR_API_KEY, YOUR_API_SECRET);
     *
     *     To get the list of your files:
     *
     *     api.get_items(function(items) {
     *          for (i in items) alert(items[i].name);
     *     });
     *
     *     To get the item list in the folder of id = 123:
     *
     *     api.get_items(function(items) {
     *              for (i in items) alert(items[i].name);
     *          }, 123);
     *
     * Api Methods:
     *
     * api.getItems()
     * api.getTransfers()
     * api.getUser()
     * api.createFolder()
     * api.searchItems()
     * api.getMessages()
     * api.createSubscription()
     * api.getSubscription()
     * api.getFolder_list()
     * api.updateUserToken()
     * api.getUserInfo()
     * api.createBucket()
     *
     * @param api_key
     * @param api_secret
     * @param error_func optional callback to be used on the event
     *      of an error response from the API. See set_error_callback() for 
     *      more information.
     */
    return function Api(api_key, api_secret, error_func) {        
        /*
         * Internal method for getting the user token.
         *
         * @param callback function(token) where the token will be passed
         */
        function getUserToken(api, callback) {
            api.callServerMethod('/user', 'acctoken', 
                function(results) {
                    callback(results.token);
                });
        }
        
        var that = {
            /**
             * @var Error callback
             */
            error : error_func,
            
            
            /**
             * Performs an ajax request to the put.io api, passing as data 
             * the request parameter and passing the put.io response to the provided callback 
             * when the response is ready.
             * 
             * This is the only method in the library that requires the use of the jQuery library.
             * 
             * TODO: Detect HTTP errors and pass them to the error function
             * 
             * @param path for the request. For instance to make a call to the files 
             *      api '/files' must be given as path.
             * @param method particular method of the api that is being called, for instance to list
             *      the files 'list' must be given as method.
             * @param callback function(results) where the response object will be passed once the 
             *      response is ready.
             * @param params parameters for the request (optional)
             */
            callServerMethod : function(path, method, callback, params) {
                /* Create a new request */
                var request = ApiRequest(api_key, api_secret, params);
                var url = RPC_URL + path + "?method=" + method;
                
                var api = this;
                
                /* Send the request to the server */
                jQuery.get(url, "request="+request, function(data) {
                    /* Temporary workaround. If the data returned
                     * is a string, then we need to parse 
                     * it as a JSON object.
                     */
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }

                    if (data.error) {
                        /* If no callback is defined for
                         * api errors, then an exception is thrown
                         */
                        if (typeof api.error !== 'function') {
                            throw data.error_message;
                        }
                        
                        // Pass the error message to the error function
                        // defined in the api
                        api.error(PutioError(data.error_message, path, method, params)); 

                        return false;
                    }
                    
                    /* Set the user info in the API */
                    api.user_id = data.id;
                    api.user_name = data.user_name;
                    
                    if (callback) {
                        callback(data.response.results);
                    }
                }, 'jsonp');
            },
        
            /**
             * Set the given function to be called on
             * a error response from the API. The function must receive
             * an object as returned by PutioError.
             * 
             * If no error callback is defined, then the default behavior is to 
             * throw an exception with the corresponding message.
             *
             * @param error_func function where the error messages will be passed.
             */
            setErrorCallback: function(error_func) {
                this.error = error_func;
            },
            
            /**
             * Before streaming a video/audio file, its best to update the token.
             * This method doesn't return anything. It just updates the Api 
             * instance.
             * 
             * @param callback optional function that will be called when the 
             *  token is updated;
             */
            updateUserToken : function(callback) {
                /* Reference api object to use it in the callback */
                var api = this;

                getUserToken(this, function(token) {
                    api.access_token = token;
                    if (callback) {
                        callback(true);
                    }
                });
            },
            
            /**
             * @return the name of the authenticated user
             */
            getUserName : function() {
                return this.user_name;
            },
            
            /**
             * Gets all the items on a specified user folder. 
             *  
             * Example:
             *      putio(YOUR_API_KEY, YOUR_API_SECRET).
             *          getItems(function(items) {
             *              for (var i = 0; i < items.length; i++) {
             *                  alert(items[i].name);
             *              }
             *          });
             *  
             * You can use these optional parameters while selecting item(s):
             *  
             *      id          = STRING or INTEGER
             *      parent_id   = STRING or INTEGER
             *      offset      = INTEGER (Default:0)
             *      limit       = INTEGER (Default: 20)
             *      type        = STRING  (See Item class for available types)
             *      orderby     = STRING  (Default: createdat_desc)
             *  
             * Orderby parameters:
             *  
             *      id_asc
             *      id_desc
             *      type_asc
             *      type_desc
             *      name_asc
             *      name_desc
             *      extention_asc
             *      extention_desc
             *      createdat_asc
             *      createdat_desc (Default)
             *  
             * See Item Class doc for the available attributes.
             *
             * @param callback a function function(items), where the list of 
             *      retrieved items will be passed 
             * @param parent_id id of the folder to list the contents (optional,
             *      defaults to 0, the base folder)
             * @param limit limit of results showed (optional, defaults to 20)
             * @param offset offset for the results (optional, defaults to 0)
             * @param args list of extra arguments such as type and orderby
             */
            getItems : function(callback, parent_id, limit, offset, args) {
                /* No need to call the server */
                if (!callback) {
                    return;
                }

                /* Default values */
                limit = limit || 20;
                offset = offset || 0;
                parent_id = parent_id || 0;
                args = args || {};

                var params = {'limit' : limit, 'offset' : offset, 'parent_id' : parent_id};
                var key;
                for (key in args) {
                    if (args.hasOwnProperty(key)) {
                        params[key] = args[key];
                    }
                }

                if (params.type) {
                    params.type = fileTypeToInt(params.type);
                }

                /* Reference this api object for using in the callback */
                var api = this;

                api.callServerMethod('/files', 'list', 
                    function(results) {
                        var items = [];
                        var k;
                        for (k = 0; k < results.length; k++) {
                            items[items.length] = Item(api, results[k]);
                        }

                        /* Pass the item list to the function */
                        callback(items);
                    }, params);

                /* Update the user token */
                this.updateUserToken();
            },


            getItem : function(callback, file_id, args) {
                /* No need to call the server */
                if (!callback) {
                    return;
                }

                var params = {'id' : file_id};                
                var key;
                for (key in args) {
                    if (args.hasOwnProperty(key)) {
                        params[key] = args[key];
                    }
                }
                
                /* Reference this api object for using in the callback */
                var api = this;

                api.callServerMethod('/files', 'info', 
                    function(results) {
                        /* Pass the item list to the function */
                        callback(Item(api, results[0]));
                    }, params);

                /* Update the user token */
                this.updateUserToken();
            },

            
            /**
             * Passes the transfer list from the server to a callback
             * function(tranfers) if the method succeeds
             * @param callback function to pass the list of transfers from the 
             *   server.
             */
            getTransfers : function(callback) {
                if (!callback) {
                    return false;
                }
                
                var api = this;
                api.callServerMethod('/transfers', 'list', function(results) {
                    var transfers = [];
                    for (var i = 0; i < results.length; i++) {
                        transfers[transfers.length] = Transfer(api, results[i]);
                    }
                    callback(transfers);
                });
            },
            
            /**
             * Creates a new folder with the provided name and 
             * passes is as an item object to the provided callback
             *
             * @param callback function(item) where the newly created item will be passed.
             * @param name name for the new folder (optional, defaults to 'New Folder')
             * @param parent_id id of the parent folder (optional, defaults to 0 for the root folder)
             */
            createFolder : function(callback, name, parent_id) {
                name = name || "New Folder";
                parent_id = parent_id || 0;

                var params = {'name' : name, 'parent_id' : parent_id};

                /* Reference this api object for using in the callback */
                var api = this;

                api.callServerMethod('/files', 'create_dir', 
                    function(results) {
                        if (callback && results.length > 0) {
                            /* Pass the item to the callback */
                            callback(Folder(api, results[0]));
                        }
                    }, params);
            },
            
            /**
             * Passes the search results for the given query to the callback. You may add search parameters to the string
             * such as:
             *      
             *      "from:'me'"      (from:shares|jack|all|etc.)
             *      "type:'video'"   (audio|image|iphone|all|etc.)
             *      "ext:'mp3'"      (avi|jpg|mp4s|all|etc.)
             *      "time:'today'"   (yesterday|thismonth|thisweek|all|etc.)
             *           
             *  Example: 
             *      api.searchItems(function(items) {
             *          for (i in items) {
             *              alert(items[i].name);
             *          }
             *      }, "'jazz' from:'me' type:'audio'");
             *
             *  @param callback function(items) where the list of retrieved items is passed. 
             *      If no items are found, an empty array is given
             *  @param query query string   
             */
            searchItems : function(callback, query) {
                if (!callback || !query) {
                    return;
                }

                /* Reference this api object for using in the callback */
                var api = this;
                var params = {'query' : query };

                this.callServerMethod('/files', 'search', 
                    function(results) {
                        var items = [], k;
                        for (k = 0; k < results.length; k++) {
                            items[items.length] = Item(api, results[k]);
                        }

                        /* Pass the list to the callback */
                        callback(items);
                    }, params);
            },
            
            /**
             * Gets the list of dashboard messages for the given
             * user and it passes it to the provided callback
             *
             * @param callback function(messages) where the list of message
             *      objects will be passed
             */
            getMessages : function(callback) {
                if (!callback) {
                    return;
                }

                /* Reference this api object for using in the callback */
                var api = this;

                this.callServerMethod('/messages', 'list', 
                    function(results) {
                        var messages = [], k;
                        for (k = 0; k < results.length; k++) {
                            messages[messages.length] = Message(api, results[k]);
                        }

                        /* Pass the message list to the callback */
                        callback(messages);
                    });
            },
            
            /**
             * Creates a new subscription and passes it to the given callback.
             *
             * Example:
             *     api.createSubscription(function(s) {
             *         alert(s.name + " created");
             *     }, "Mininova", "http://www.mininova.org/rss.xml");
             *     
             * See Subscription Class for available attributes 
             *
             * @param callback function([Subscription Object]) where the created subscription
             *     will be passed if the request succeeds.
             * @param name name for the new subscription
             * @param url url for the new subscription
             * @param args additional arguments for the new subscription
             */
            createSubscription : function(callback, name, url, args) {
                var params = { 'title' : name, 'url' : url };
                var key;
                for (key in args) {
                    if (args.hasOwnProperty(key)) {
                        params[key] = args[key];
                    }
                }

                /* Reference this api object for using in the callback */
                var api = this;

                this.callServerMethod('/subscriptions', 'create', 
                    function(results) {
                        if (callback && results.length > 0) {
                            /* Pass the subscription to the callback */
                            callback(Subscription(api, results[0]));
                        }
                    }, params);

            },
            
            /**
             * Returns a list of your subscriptions.
             *
             * @param callback function([Subscription Array]) where the list of subscriptions will
             *      will be passed if the request succeeds.
             */
            getSubscriptions : function(callback) {
                if (!callback) {
                    return;
                }

                /* Reference this api object for using in the callback */
                var api = this;

                this.callServerMethod('/subscriptions', 'list', function(results) {
                    var subscriptions = [], k;
                    for (k = 0; k < subscriptions.length; k++) {
                        subscriptions[subscriptions.length] = Subscription(api, 
                            results[k]);
                    }

                    /* Pass the list to the callback */
                    callback(subscriptions);
                });
            },
            
            /**
             * This method returns a flat list of all your folders. Create
             * your own method if you need a tree like list.
             * 
             * Parent_id is id of the container folder
             * 
             * Here is the returned item before being processed:
             *      
             *  {
             *      'dirs': [...{sub folder 1}, {sub folder 2}...],  # or []
             *      'shared': false,
             *      'id': u'4220',
             *      'name': u'renamed (4)',
             *      'default_shared': false
             *  }
             *  
             * See Folder Class for available attributes
             *
             * @param callback function([Folder Array]) where the folder list will be passed if
             *      the request succeeds.
             */
            getFolderList : function(callback) {
                if (!callback) {
                    return;
                }

                /* Reference this api object for using in the callback */
                var api = this;
                
                var createFolderList = function(treeList, folders) {
                    folders = folders || [];

                    /* Make a copy of the sub directory info */
                    var dirs = treeList.dirs;

                    /* Delete it from the main list element */
                    delete treeList.dirs;

                    /* Append the parent folder */
                    folders[folders.length] = Folder(api, treeList);

                    /* Then append the child folders */
                    var k;
                    if (dirs.length > 0) {
                        for (k = 0; k < dirs.length; k++) {
                            createFolderList(dirs[k], folders);
                        }
                    }
                };

                this.callServerMethod('/files', 'dirmap', function(results) {
                    var folders = [];
                    createFolderList(results, folders); 

                    /* Pass the list of folders to the callback */
                    callback(folders);
                });
            },
            
            /**
             * Gives information about the authenticated user. Use this to inform
             * user about its quotas, sharing size, current available space, etc.
             *  
             * All sizes are in bytes. Use human_size(byte) to convert if necessary.
             *
             * Returned Attributes:
             *     
             *      info.bw_quota
             *      info.disk_quota
             *      info.bw_quota_available
             *      info.disk_quota_available
             *      info.name
             *      info.shared_space
             *      info.friends_count
             *      info.shared_items
             *  
             * @param callback function(user), where the user object will be 
             *  passed after the response is ready
             */
            getUser : function(callback) {
                if (!callback) {
                    return;
                }

                /* Reference api object to use it in the callback */
                var api = this;

                this.callServerMethod('/user', 'info', function(results) {
                    if (results.length > 0) {
                        /* Pass the user to the callback */
                        callback(User(api, results[0]));
                    }
                });
            },
             
            /**
             * Returns friends of the authenticated user.
             *
             * Friend attributes:
             * 
             *     friend.id
             *     friend.name
             *     friend.dir_id
             *
             * Example:
             *     friends = api.getFriends(function(friends) {
             *         for (k in friends) {
             *             alert(friends[k].name);
             *         }
             *     });
             *
             * To get a friend's files, use dir_id as a parent_id with get_items()
             * 
             * Option 1:
             *     for (k in friends) {
             *         api.getItems(function(items) {
             *             for (i in items) {
             *                 alert(items[i].name);
             *             }
             *         }, friends[k].dir_id);
             *     }
             * 
             * Option 2:
             *     for (k in friends) {
             *         friends[k].getItems(function(items) {
             *             for (i in items) {
             *                 alert(items[i].name);
             *             }
             *         });
             *     }
             *
             * @params callback function([Friend Array]) where the list of 
             *     friends will be passed if the request succeeds.
             */
            getFriends : function(callback) {
                if (!callback) {
                    return false;
                }

                /* Reference api object to use it in the callback */
                var api = this;

                this.callServerMethod('/user', 'friends', function(results) {
                    var friends = [], k;
                    for (k = 0; k < results.length; k++) {
                        friends[friends.length] = Friend(api, results[k]);
                    }

                    /* Pass the list to the callback */
                    callback(friends);
                });
            },
            
            /**
             * You'll need buckets to analyze and fetch URLs. Bucket is basicly a
             * container of one or more URLs, which then you can analyze and make
             * Put.io fetch the successfully analyzed URLs.
             * 
             * To fetch some URLs, you'll need to:
             * - Create a bucket (or use already existing one)
             * - Use Add method to add some URLs to the bucket
             * - Make Put.io analyze the bucket
             * - Add more or delete some of them
             * - And make Put.io fetch the URLs in the bucket. 
             *  
             * After the analyzation, you can get a report about the bucket content
             * and the user quotas. For this, use get_report() method of UrlBucket 
             * class.
             *
             * @returns an empty url bucket object
             */
            createBucket : function() {
                return UrlBucket(this);
            }
        };
        
        /* Update user token after creating the object */
        that.updateUserToken();
        
        return that;
    };
}());
