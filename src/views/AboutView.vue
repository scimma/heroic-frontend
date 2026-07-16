<script setup>
</script>

<template>
  <v-container class="acknowledgements-view" max-width="900">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-card class="pa-6" elevation="2">
          <v-card-title class="text-h4 mb-4">Acknowledgements</v-card-title>
          <v-card-text>
            <p class="text-body-1 mb-6">
              HEROIC (Hop Enabled Realtime Observatory Information and Coordination) is a
              <a href="https://www.scimma.org" target="_blank" rel="noopener noreferrer">SCIMMA</a> product,
              developed and maintained by the <a href="https://www.scimma.org/about/people" target="_blank" rel="noopener noreferrer">SCIMMA Team</a>,
              with support from the observatories and institutions that contribute telescope and instrument
              status to the network.
            </p>
            <v-row align="center">
              <v-col cols="12" sm="3" class="text-center">
                <img
                  src="@/assets/nsf-logo.png"
                  alt="National Science Foundation logo"
                  class="nsf-logo"
                >
              </v-col>
              <v-col cols="12" sm="9">
                <p class="text-body-1">
                  This project is supported by National Science Foundation grants
                  AST-2432428 and OAC-2311355. Any opinions, findings, conclusions or
                  recommendations expressed in this material are those of the developers
                  and do not necessarily reflect the views of the National Science
                  Foundation.
                </p>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.nsf-logo {
  max-width: 120px;
  width: 100%;
  height: auto;
}
</style>