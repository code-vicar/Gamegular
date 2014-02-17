(function() {
  'use strict';

  var normalizeOnEachFrame = function() {
    //  default fps will be 60
    var onEachFrame = function(cb) {
      _cb = function() {
        if (cb()) {
          setTimeout(_cb, (1000 / 60));
        }
      };
      _cb();
    };

    if (window.webkitRequestAnimationFrame) {
      onEachFrame = function(cb) {
        _cb = function() {
          if (cb()) {
            webkitRequestAnimationFrame(_cb);
          }
        };
        _cb();
      };
    } else if (window.mozRequestAnimationFrame) {
      onEachFrame = function(cb) {
        _cb = function() {
          if (cb()) {
            mozRequestAnimationFrame(_cb);
          }
        };
        _cb();
      };
    } else if (window.requestAnimationFrame) {
      onEachFrame = function(cb) {
        _cb = function() {
          if (cb()) {
            requestAnimationFrame(_cb);
          }
        };
        _cb();
      }
    } else if (window.msRequestAnimationFrame) {
      onEachFrame = function(cb) {
        _cb = function {
          if (cb()) {
            msRequestAnimationFrame(_cb);
          }
        };
        _cb();
      }
    }

    return onEachFrame;
  };

  angular.module('RenderLoop', [])
  .provider('RenderLoop', function() {
    
    this.$get = ['$rootScope', function($rootScope) {
      //  create the onEachFrame function, normalizing browser inconsistency
      var onEachFrame = normalizeOnEachFrame();

      var execListeners = function(eventName, data) {
        var i;
        var eventListeners = this.listeners[eventName];
        if (eventListeners && eventListeners.length > 0) {
          for (i = 0; i < eventListeners.length; i++) {
            eventListeners[i](data);
          }
        }
      };

      var RenderLoop = function(GameLoopEmitter) {
        //  private
        var self = this;
        this.listeners = {};
        this.LastGameLoopTick = null;
        this.IsRunning = false;
        this.GLE = GameLoopEmitter;

        // callback on each game loop tick
        this.OnGameLogicTick = function(tick) {
          self.LastGameLoopTick = tick;
        };

        // callback on each rendering frame
        this.Tick = function() {
          //  check if we stopped the render loop, if so return false
          if (!self.IsRunning) {
            return false;
          }

          //  calculate the interpolation value
          var Interpolation = 0;
          if (self.LastGameLoopTick) {
            var tDiff = (self.LastGameLoopTick.next - Date.now());
            if (tDiff > 0) {
              Interpolation = (tDiff / self.LastGameLoopTick.interval);
            }
          }

          //  execute on each 'tick' of loop
          execListeners.call(self, 'tick', Interpolation);

          //  return true to let the animationFrame know to keep running
          return true;
        };
      };

      RenderLoop.prototype.on = function(eventName, cb) {
        if (this.listeners[eventName]) {
          this.listeners[eventName].push(cb);
        } else {
          this.listeners[eventName] = [cb];
        }
      };

      RenderLoop.prototype.off = function(eventName, cb) {
        if (!eventName) {
          this.listeners = {};
        } else if (!cb) {
          this.listeners[eventName] = [];
        } else {
          if (this.listeners[eventName]) {
            var idx = this.listeners[eventName].indexOf(cb);
            if (idx > -1) {
              this.listeners[eventName].splice(idx, 1);
            }
          }
        }
      };

      //  Run the game loop
      RenderLoop.prototype.Run = function() {
        if (!this.IsRunning) {
          // if the loop is not running, run it.
          //  start listening to the game loop again
          this.GLE.on('tick', this.OnGameLogicTick);
          //  if the loop is stopped, then start a new one
          this.IsRunning = true;
          execListeners.call(this, 'run');
          onEachFrame(this.Tick);
        }
      };

      //  Stop the game loop
      RenderLoop.prototype.Stop = function() {
        if (this.IsRunning) {
          //  remove game loop listener
          this.GLE.off('tick', this.OnGameLogicTick);
          this.LastGameLoopTick = null;
          //  set is running to false
          this.IsRunning = false;
          execListeners.call(this, 'stop');
        }
      };
      
      return RenderLoop;
    }];

  });

}());
