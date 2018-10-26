/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
// Written by Forge Partner Development
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Autodesk.Forge;
using Autodesk.Forge.Model;
using Newtonsoft.Json.Linq;
using System.Net;
using RestSharp;
using RestSharp.Authenticators;

namespace forgeSample.Controllers
{
    public class EC3Controller : ControllerBase
    {
        RestClient _client = new RestClient("https://etl-api.cqd.io");

        [HttpPost]
        [Route("api/ec3/oauth/signin")]
        public async Task<EC3Token> SignIn(string userName, string password)
        {
            RestRequest request = new RestRequest("/api/rest-auth/login", RestSharp.Method.POST);
            request.AddJsonBody(new { username = userName, password = password });
            IRestResponse<EC3Token> response = await _client.ExecuteTaskAsync<EC3Token>(request);

            Credentials credentials = await Credentials.FromSessionAsync(Request.Cookies, Response.Cookies);
            credentials.SetEC3Token(response.Data.Key, Response.Cookies);

            return new EC3Token { Key = credentials.EC3Token };
        }

        [HttpGet]
        [Route("api/ec3/oauth/token")]
        public async Task<EC3Token> GetToken()
        {
            Credentials credentials = await Credentials.FromSessionAsync(Request.Cookies, Response.Cookies);

            if (credentials == null)
            {
                base.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                return null;
            }

            if (string.IsNullOrEmpty(credentials.EC3Token))
            {
                base.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
                return null;
            }

            return new EC3Token { Key = credentials.EC3Token };
        }

        public class EC3Token
        {
            public string Key { get; set; }
        }

        [HttpGet]
        [Route("api/ec3/projects")]
        public async Task<dynamic> GetProjects()
        {
            Credentials credentials = await Credentials.FromSessionAsync(Request.Cookies, Response.Cookies);

            RestRequest request = new RestRequest("/api/projects", Method.GET);
            request.AddHeader("Authorization", string.Format("Token {0}", credentials.EC3Token));
            IRestResponse response = await _client.ExecuteTaskAsync(request);

            return response.Content;
        }

        [HttpPost]
        [Route("api/ec3/projects/{projectid}")]
        public async Task Submit(string projectid, [FromBody]JArray assemblies)
        {
            Credentials credentials = await Credentials.FromSessionAsync(Request.Cookies, Response.Cookies);

            foreach (dynamic assembly in assemblies)
            {
                RestRequest postAssembly = new RestRequest("/api/projects/{projectid}/assemblies", Method.POST);
                postAssembly.AddUrlSegment("projectid", projectid);
                postAssembly.AddJsonBody(new { name = (string)assembly.name });
                postAssembly.AddHeader("Authorization", string.Format("Token {0}", credentials.EC3Token));
                IRestResponse resAssembly = await _client.ExecuteTaskAsync(postAssembly);
                dynamic newAssembly = JObject.Parse(resAssembly.Content);


                int i = 0;
                foreach (dynamic subassembly in assembly.subassembly)
                {
                    i++;
                    if (i > 5) break;

                    RestRequest postSubassembly = new RestRequest("api/assemblies/{assemblyid}/subassemblies", Method.POST);
                    postSubassembly.AddUrlSegment("assemblyid", newAssembly.id);
                    postSubassembly.AddJsonBody(new { name = (string)subassembly.name });
                    postSubassembly.AddHeader("Authorization", string.Format("Token {0}", credentials.EC3Token));
                    IRestResponse resSubassembly = await _client.ExecuteTaskAsync(postSubassembly);
                    dynamic newSubassembly = JObject.Parse(resSubassembly.Content);

                    foreach (dynamic element in subassembly.elements)
                    {

                        RestRequest postElement = new RestRequest("api/subassemblies/{subassemblyid}/elements", Method.POST);
                        postElement.AddUrlSegment("subassemblyid", newSubassembly.id);
                        postElement.AddJsonBody(new { name = (string)element.name, unit = (string)element.unit, quantity = (double)element.volume, collection_id = "aaf6d882377b4edf91270cc3188020be" });
                        postElement.AddHeader("Authorization", string.Format("Token {0}", credentials.EC3Token));
                        IRestResponse resElement = await _client.ExecuteTaskAsync(postElement);
                        dynamic newElement = JObject.Parse(resElement.Content);
                    }
                }
            }
            Ok();
        }
    }
}