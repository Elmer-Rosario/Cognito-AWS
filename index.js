global.fetch = require('node-fetch')
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');
const AWS = require('aws-sdk');
const express = require('express');
const serverless = require('serverless-http');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const poolData = {
  UserPoolId: 'us-east-1_bzewJJvhX',
  ClientId: '88lj6rgjuit71beo84i4grqu2',
}
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);



///////////////////// FUNCTION LOGIN USER ////////////////////////////////////////////

app.post('/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const authenticationData = {
    Username: username,
    Password: password,
  }
  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  const userData = {
    Username: username,
    Pool: userPool,
  }

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (result) => {

      const CognitoAccessToken = result.getAccessToken().getJwtToken(); //token
      const CognitoRefreshToken = result.getRefreshToken().getToken();
      const CognitoIdToken = result.getIdToken().getJwtToken();

      console.log(CognitoAccessToken);
      res.status(200).json({
        COGNITOACCESSTOKEN: CognitoAccessToken,
        COGNITOIDTOKEN: CognitoIdToken,
        COGNITOREFRESHTOKEN: CognitoRefreshToken
      });
    },
    onFailure: (err) => {

      console.log(err);
      res.status(401).send(err);
    }
  });
});


/////////////////////////////////////  FUNCTION REGISTRER USER //////////////////////////////

app.post('/registry', async (req, res) => {

  const user = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;

  if (password != confirmPassword) {
    res.status(502).json({ Error: 'the passwords do not match, enter the same password please' })
  } else {
    const attributeList = [];
    const dataEmail = {
      Name: 'email',
      Value: email,
    };

    const dataPersonalName = {
      Name: 'name',
      Value: user,
    };

    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
    var attributePersonalName = new AmazonCognitoIdentity.CognitoUserAttribute(dataPersonalName);

    attributeList.push(attributeEmail);
    attributeList.push(attributePersonalName);

    await userPool.signUp(user, password, attributeList, null, (err, result) => {
      if (err) {
        res.status(400).json(err);
        return;
      }
      cognitoUser = result.user;
      console.log('user name is ' + cognitoUser.getUsername());
      res.status(200).json(cognitoUser)
    });
  }
})


/////////////////////////////////////  FUNCTION AUTHENTICATE USER //////////////////////////////

app.post('/verification', async (req, res) => {
  const usern = req.body.username;
  const code = req.body.code;

  const userData1 = {
    Username: usern,
    Pool: userPool
  };

  const cognitoUser1 = new AmazonCognitoIdentity.CognitoUser(userData1);
  await cognitoUser1.confirmRegistration(code, true, (err, result) => {
    if (err) {
      res.status(400).json(err);
      return;
    }
    res.status(200).json(result);
  });
})


/////////////////////////////////////  FUNCTION CHANGE PASSWORD /////////////////////////////////

app.put('/Change_password', (req, res) => {

  const username = req.body.username
  const Password = req.body.Password
  const newPassword = req.body.newPassword
  const confirmpassword = req.body.confirmpassword

  var authenticationData = {
    Username: username,
    Password: Password,
  };

  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
  const userData = {
    Username: username,
    Pool: userPool,
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: function (result) {
      if (newPassword == confirmpassword) {

        cognitoUser.changePassword(Password, confirmpassword, function (err, result) {
          if (err) {

            console.log(err);
            res.status(200).send(err);
          } else {

            console.log(result);
            res.status(200).json({
              msg: username + 'su contraceña se actulalizo exitosamente '
            })
          }
        });
      } else {

        console.log("The new passwords you entered do not match");
        res.statusCode(200).send("The new passwords you entered do not match");
      }
    },
    onFailure: function (err) {
      let reponse = {
        message: 'There was an error updating the ' + username + ' Password'
      };
      console.log(reponse);
      res.status(502).send(reponse);
    },
  });
})



///////////////////////////////////// START FUNCTION FORGOT PASSWORD ////////////////////////////

app.post('/forgotPassword', (req, res) => {

  const username = req.body.username

  const userData = {
    Username: username,
    Pool: userPool,
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  cognitoUser.forgotPassword({
    onSuccess: function (result) {

      console.log(result);
      res.status(200).json({
        msg: 'verifique su correo para restablecer su cuenta'
      })
    },
    onFailure: function (err) {

      console.log(err);
      res.status(502).send(err)
    }
  });
})



/////////////////////////////////  FUNCTION FOORGOT UPDATE PASSWORD /////////////////////////////////

app.put('/forgotPassword_update', (req, res) => {

  const username = req.body.username
  const verificationcod = req.body.verificationcod
  const newpassword = req.body.newpassword
  const confirmNewPassword = req.body.confirmNewPassword

  const userData = {
    Username: username,
    Pool: userPool,
  };

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);

  const verificationCode = verificationcod;
  const newPassword = newpassword;
  if (newpassword == confirmNewPassword) {
    cognitoUser.confirmPassword(verificationCode, newPassword, {
      onSuccess: (result) => {

        console.log(result);
        res.status(200).json({
          msg: 'Su cuenta fue reestablecida'
        });
      },
      onFailure: (err) => {

        console.log(err);
        res.status(401).send(err);
      }

    });
  } else {

    console.log("The new passwords you entered do not match");
    res.status(200).send("The new passwords you entered do not match");
  }
})



/////////////////////////////////  FUNCTION REFLESH SESSION /////////////////////////////////

app.post('/RefreshToken', (req, res) => {

  const username = req.body.username;
  const CognitoAccessToken = req.body.CognitoAccessToken;
  const CognitoIdToken = req.body.CognitoIdToken;
  const CognitoRefreshToken = req.body.CognitoRefreshToken;

  const cognitoUser = new AmazonCognitoIdentity.CognitoUser({
    Username: username,
    Pool: userPool,
  });

  const AccessToken = new AmazonCognitoIdentity.CognitoAccessToken({ AccessToken: CognitoAccessToken });
  const IdToken = new AmazonCognitoIdentity.CognitoIdToken({ IdToken: CognitoIdToken });
  const RefreshTokenn = new AmazonCognitoIdentity.CognitoRefreshToken({ RefreshToken: CognitoRefreshToken });

  const sessionData = {
    IdToken: IdToken,
    AccessToken: AccessToken,
    RefreshToken: RefreshTokenn
  };

  const cachedSession = new AmazonCognitoIdentity.CognitoUserSession(sessionData);
  if (cachedSession.isValid()) {

    res.status(200).json({ msg: 'the token still does  expire' })
  } else {
    cognitoUser.refreshSession(RefreshTokenn, (err, session) => {
      if (err) {

        console.log(err);
        res.status(502).json(err)
      }
      else {

        const CognitoAccessToken = session.getIdToken().getJwtToken();
        //const tokenUpdate = session.idToken.jwtToken; // will this provide new IdToken?
        //localStorage.setItem('api_key', tokenUpdate);
        res.status(200).json({
          CognitoAccessToken: CognitoAccessToken,
        });
      }
    });
  }
})


module.exports.login = serverless(app);

