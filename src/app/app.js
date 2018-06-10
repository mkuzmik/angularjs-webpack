import angular from 'angular';

import "jsonwebtoken";
import jwt from "jsonwebtoken";

import "../style/main.css"

const MODULE_NAME = 'app';

const module = angular.module(MODULE_NAME, [])
  .config(($httpProvider) => {
    $httpProvider.interceptors.push('authorizationHeaderInterceptor');
  });

module.component('home', {
  template: require('./home.html'),
  controller: function (authenticationService) {
    let that = this;

    that.authenticated = authenticationService.isAuthenticated();

    that.logout = () => {
      authenticationService.logout()
        .then(() => that.authenticated = false);
    }
  }
});

module.component('categories', {
  template: require('./categories.html'),
  controller: function ($http, authenticationService) {
    let that = this;

    that.toAdd = {};

    that.hasEditPermission = (category) => {
      const userId = authenticationService.getUserId();
      const role = authenticationService.getRole();

      return (userId == category.userId) || (role === 'ADMIN');
    };

    that.refetch = () => $http.get('/forests').then(response => {
      that.categories = response.data;
      that.categories.sort((a, b) => a.id - b.id);
    });

    that.refetch();

    that.show = (category) => {
      if (that.chosenCategory !== category)
        that.chosenCategory = category;
      else
        that.chosenCategory = undefined;
    };

    that.add = () => {
      $http.post('/forests', that.toAdd).then(() => {
        that.toAdd = {};
        that.refetch();
      });
    };

    that.editMode = (forest) => {
      forest.toEdit = angular.copy(forest);
      forest.editMode = true;
      forest.toEdit.id = undefined;
      forest.toEdit.editMode = undefined;
      forest.toEdit.elves = undefined;
    };

    that.edit = (forest) => {
      forest.toEdit.userId = undefined;
      $http.put('/forests/' + forest.id, forest.toEdit).then(() => {
        forest.editMode = false;
        that.refetch();
      });
    };

    that.delete = (forest) => {
      $http.delete('/forests/' + forest.id).then(() => {
        that.refetch();
      });
    };
  }
});

module.component('elements', {
  template: require('./elements.html'),
  bindings: {
    category: '<'
  },
  controller: function ($http, authenticationService) {
    let that = this;

    that.bowTypes = ['SMALL', 'BIG'];
    that.powerTypes = ['SPEED', 'STRENGHT'];

    that.$onChanges = function (changes) {
      that.refetch();
    };

    that.refetch = () => {
      $http.get('/elves').then(response => {
        that.elves = response.data.filter(elf => elf.forestId === that.category.id);
        that.elves.sort((a, b) => a.id - b.id);
        that.toAdd = { forestId: that.category.id };
      });
    };

    that.editMode = (elf) => {
      elf.toEdit = angular.copy(elf);
      elf.editMode = true;
      elf.toEdit.id = undefined;
      elf.toEdit.editMode = undefined;
    };

    that.hasEditPermission = () => {
      const userId = authenticationService.getUserId();
      const role = authenticationService.getRole();

      return (userId == that.category.userId) || (role === 'ADMIN');
    };

    that.edit = (elf) => {
      $http.put('/elves/' + elf.id, elf.toEdit).then(() => {
        elf.editMode = false;
        that.refetch();
      });
    };

    that.add = () => {
      $http.post('/elves', that.toAdd).then(() => {
        that.refetch();
      });
    };

    that.delete = (elf) => {
      $http.delete('/elves/' + elf.id).then(() => {
        that.refetch();
      });
    };
  }
});

class LoginComponent {
  constructor (authenticationService) {
    this.authenticationService = authenticationService;
    this.username = '';
    this.password = '';
    this.error = false;
  }

  login() {
    this.authenticationService.loginWith(this.username, this.password,
      (e) => {
        this.authenticated = true;
      },
      (e) => {
        this.error = true;
        this.errorMessage = "Wrror";
      });
  }
}

module.component('login', {
  template: require('./login.template.html'),
  bindings: {
    authenticated: '='
  },
  controller: LoginComponent
});

module.service('tokenService', function () {
  let that = this;

  that.setToken = (token) => that.token = token;

  that.getToken = () => that.token;
});

class AuthenticationService {

  constructor($http, tokenService) {
    this.http = $http;
    this.tokenService = tokenService;
  }

  loginWith(username, password, successCallback, errorCallback) {
    return this.http.post('/auth/login', { username, password })
      .then(response => {
        this.authenticatedWith(response.headers('Authorization'));
        successCallback(response);
      })
      .catch(response => {
        if (errorCallback)
          errorCallback(response);
      });
  }

  authenticatedWith(token) {
    this.tokenService.setToken(token);
    const decoded = jwt.decode(token);
    this.userId = decoded.userId;
    this.role = decoded.role;
  }

  logout() {
    return this.http.delete('/auth/logout')
      .then(response => {
        this.tokenService.setToken(undefined);
        this.userId = undefined;
        this.role = undefined;
      });
  }

  isAuthenticated() {
    return this.userId !== undefined;
  }

  getUserId() {
    return this.userId;
  }

  getRole() {
    return this.role;
  }
}

module.service('authenticationService', AuthenticationService);

module.factory('authorizationHeaderInterceptor',
  (tokenService) => ({
    request: (config) => {
      const token = tokenService.getToken();

      if (token)
        config.headers['Authorization'] = token;

      return config;
    }
  })
);

export default MODULE_NAME;
